import { CodeEditor, Monaco, monacoTypes } from '@grafana/ui';
import React, { useMemo } from 'react';
import { getStatementPosition } from '../standardSql/getStatementPosition';
import { getStandardSuggestions } from '../standardSql/getStandardSuggestions';
import { initSuggestionsKindRegistry, SuggestionKindRegistyItem } from '../standardSql/suggestionsKindRegistry';
import {
  CompletionItemPriority,
  CustomSuggestion,
  PositionContext,
  SQLCompletionItemProvider,
  StatementPosition,
  SuggestionKind,
} from '../types';
import { getSuggestionKinds } from '../utils/getSuggestionKind';
import { linkedTokenBuilder } from '../utils/linkedTokenBuilder';
import { getTableToken } from '../utils/tokenUtils';
import { TRIGGER_SUGGEST } from '../utils/commands';
import { LinkedToken } from '../utils/LinkedToken';
import { v4 } from 'uuid';
import { Registry } from '@grafana/data';
import {
  FunctionsRegistryItem,
  OperatorsRegistryItem,
  StatementPositionResolversRegistryItem,
  SuggestionsRegistyItem,
} from '../standardSql/types';
import {
  initFunctionsRegistry,
  initOperatorsRegistry,
  initStandardSuggestions,
} from '../standardSql/standardSuggestionsRegistry';
import { initStatementPositionResolvers } from '../standardSql/statementPositionResolversRegistry';

const STANDARD_SQL_LANGUAGE = 'sql';

interface LanguageDefinition extends monacoTypes.languages.ILanguageExtensionPoint {
  // TODO: Will allow providing a custom language definition.
  loadLanguage?: (module: any) => Promise<void>;
  // Provides API for customizing the autocomplete
  completionProvider?: (m: Monaco) => SQLCompletionItemProvider;
}

interface SQLEditorProps {
  query: string;
  onChange: (q: string) => void;
  language?: LanguageDefinition;
}

const defaultTableNameParser = (t: LinkedToken) => t.value;

interface LanguageRegistries {
  functions: Registry<FunctionsRegistryItem>;
  operators: Registry<OperatorsRegistryItem>;
  suggestionKinds: Registry<SuggestionKindRegistyItem>;
  positionResolvers: Registry<StatementPositionResolversRegistryItem>;
}

const LANGUAGES_CACHE = new Map<string, LanguageRegistries>();
const INSTANCE_CACHE = new Map<string, Registry<SuggestionsRegistyItem>>();

export const SQLEditor: React.FC<SQLEditorProps> = ({ onChange, query, language = { id: STANDARD_SQL_LANGUAGE } }) => {
  // create unique language id for each SQLEditor instance
  const id = useMemo(() => {
    const uid = v4();
    return `${language.id}-${uid}`;
  }, [language.id]);

  return (
    <CodeEditor
      height={'240px'}
      language={id}
      value={query}
      onBlur={onChange}
      showMiniMap={false}
      showLineNumbers={true}
      onBeforeEditorMount={(m: Monaco) => {
        registerLanguageAndSuggestions(m, language, id);
      }}
    />
  );
};

export const registerLanguageAndSuggestions = async (monaco: Monaco, l: LanguageDefinition, lid: string) => {
  if (!l.loadLanguage) {
    // Assume lanuage based on standard Monaco SQL definition
    const defaultSQLLanguage = await getSQLLangConf(monaco);
    monaco.languages.register({ id: lid });
    monaco.languages.setMonarchTokensProvider(lid, { ...defaultSQLLanguage.language });
    monaco.languages.setLanguageConfiguration(lid, { ...defaultSQLLanguage.conf });

    if (l.completionProvider) {
      const customProvider = l.completionProvider(monaco);
      extendStandardRegistries(l.id, lid, customProvider);
      const languageSuggestionsRegistries = LANGUAGES_CACHE.get(l.id)!;
      const instanceSuggestionsRegistry = INSTANCE_CACHE.get(lid)!;

      const completionProvider: monacoTypes.languages.CompletionItemProvider['provideCompletionItems'] = async (
        model,
        position,
        context,
        token
      ) => {
        const currentToken = linkedTokenBuilder(monaco, model, position, 'sql');
        const statementPosition = getStatementPosition(currentToken, languageSuggestionsRegistries.positionResolvers);
        const kind = getSuggestionKinds(statementPosition, languageSuggestionsRegistries.suggestionKinds);
        const ctx: PositionContext = {
          position,
          currentToken,
          statementPosition,
          kind,
          range: monaco.Range.fromPositions(position),
        };

        // // Completely custom suggestions - hope this won't we needed
        // let ci;
        // if (customProvider.provideCompletionItems) {
        //   ci = customProvider.provideCompletionItems(model, position, context, token, ctx);
        // }

        const stdSuggestions = await getStandardSuggestions(
          monaco,
          currentToken,
          kind,
          ctx,
          instanceSuggestionsRegistry
        );

        return {
          // ...ci,
          suggestions: stdSuggestions,
        };
      };

      monaco.languages.registerCompletionItemProvider(lid, {
        ...customProvider,
        provideCompletionItems: completionProvider,
      });
    }
  } else {
    // TODO custom dialect support
  }
};

function extendStandardRegistries(id: string, lid: string, customProvider: SQLCompletionItemProvider) {
  if (!LANGUAGES_CACHE.has(id)) {
    initializeLanguageRegistries(id);
  }

  const languageRegistries = LANGUAGES_CACHE.get(id)!;

  if (!INSTANCE_CACHE.has(lid)) {
    INSTANCE_CACHE.set(
      lid,
      new Registry(initStandardSuggestions(languageRegistries.functions, languageRegistries.operators))
    );
  }

  const instanceSuggestionsRegistry = INSTANCE_CACHE.get(lid)!;

  if (customProvider.supportedFunctions) {
    for (const func of customProvider.supportedFunctions()) {
      const exists = languageRegistries.functions.getIfExists(func.id);
      if (!exists) {
        languageRegistries.functions.register(func);
      }
    }
  }

  if (customProvider.supportedOperators) {
    for (const op of customProvider.supportedOperators()) {
      const exists = languageRegistries.operators.getIfExists(op.id);
      if (!exists) {
        languageRegistries.operators.register({ ...op, name: op.id });
      }
    }
  }

  if (customProvider.customStatementPlacement) {
    for (const placement of customProvider.customStatementPlacement()) {
      const exists = languageRegistries.positionResolvers.getIfExists(placement.id);
      if (!exists) {
        languageRegistries.positionResolvers.register({
          ...placement,
          id: placement.id as StatementPosition,
          name: placement.id,
        });
        languageRegistries.suggestionKinds.register({
          id: placement.id as StatementPosition,
          name: placement.id,
          kind: [],
        });
      } else {
        // Allow extension to the built-in placement resolvers
        const origResolve = exists.resolve;
        exists.resolve = (...args) => {
          const orig = origResolve(...args);
          const ext = placement.resolve(...args);
          return orig || ext;
        };
      }
    }
  }

  if (customProvider.customSuggestionKinds) {
    for (const kind of customProvider.customSuggestionKinds()) {
      kind.applyTo?.forEach((applyTo) => {
        const exists = languageRegistries.suggestionKinds.getIfExists(applyTo);
        if (exists) {
          // avoid duplicates
          if (exists.kind.indexOf(kind.id as SuggestionKind) === -1) {
            exists.kind.push(kind.id as SuggestionKind);
          }
        }
      });

      instanceSuggestionsRegistry.register({
        id: kind.id as SuggestionKind,
        name: kind.id,
        suggestions: kind.suggestionsResolver,
      });
    }
  }

  if (customProvider.tables) {
    const stbBehaviour = instanceSuggestionsRegistry.get(SuggestionKind.Tables);
    const s = stbBehaviour!.suggestions;
    stbBehaviour!.suggestions = async (ctx, m) => {
      const o = await s(ctx, m);
      const oo = (await customProvider.tables!.resolve!()).map((x) => ({
        label: x.name,
        kind: 1,
        insertText: x.completion ?? x.name,
        sortText: CompletionItemPriority.High,
        command: TRIGGER_SUGGEST,
      }));
      return [...o, ...oo];
    };
  }

  if (customProvider.columns) {
    const stbBehaviour = instanceSuggestionsRegistry.get(SuggestionKind.Columns);
    const s = stbBehaviour!.suggestions;
    stbBehaviour!.suggestions = async (ctx, m) => {
      const o = await s(ctx, m);
      const tableToken = getTableToken(ctx.currentToken);
      let table = '';
      const tableNameParser = customProvider.tables?.parseName ?? defaultTableNameParser;

      if (tableToken && tableToken.value) {
        table = tableNameParser(tableToken).trim();
      }

      let oo: CustomSuggestion[] = [];
      if (table) {
        const columns = await customProvider.columns?.resolve!(table);
        oo = columns
          ? columns.map<CustomSuggestion>((x) => ({
              label: x.name,
              kind: m.languages.CompletionItemKind.Field,
              insertText: x.completion ?? x.name,
              sortText: CompletionItemPriority.High,
            }))
          : [];
      }
      return [...o, ...oo];
    };
  }
}

/**
 * Initializes language specific registries that are treated as singletons
 */
function initializeLanguageRegistries(id: string) {
  if (!LANGUAGES_CACHE.has(id)) {
    LANGUAGES_CACHE.set(id, {
      functions: new Registry(initFunctionsRegistry),
      operators: new Registry(initOperatorsRegistry),
      suggestionKinds: new Registry(initSuggestionsKindRegistry),
      positionResolvers: new Registry(initStatementPositionResolvers),
    });
  }

  return LANGUAGES_CACHE.get(id)!;
}

async function getSQLLangConf(monaco: Monaco) {
  const allLangs = monaco.languages.getLanguages();
  const langObj = allLangs.find(({ id }) => id === 'sql');

  if (langObj) {
    // @ts-ignore : Ain't public API :/ https://github.com/microsoft/monaco-editor/issues/2123#issuecomment-694197340
    return await langObj.loader();
  }

  return Promise.resolve({ conf: null, language: null });
}
