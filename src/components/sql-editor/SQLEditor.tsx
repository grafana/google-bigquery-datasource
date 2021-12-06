import { CodeEditor, Monaco, monacoTypes } from '@grafana/ui';
import React from 'react';
import { getStatementPosition } from './standardSql/getStatementPosition';
import {
  functionsRegistry,
  statementPositionResolversRegistry,
  stdSuggestionsRegistry,
} from './standardSql/registries';
import { getStandardSuggestions } from './standardSql/getStandardSuggestions';
import { suggestionsKindRegistry } from './standardSql/suggestionsKindRegistry';
import { CompletionItemPriority, CustomSuggestion, PositionContext, SQLCompletionItemProvider } from './types';
import { getSuggestionKinds } from './utils/getSuggestionKind';
import { linkedTokenBuilder } from './utils/linkedTokenBuilder';
import { StatementPosition, SuggestionKind } from './utils/types';
import { getTableToken } from './utils/tokenUtils';

const STANDARD_SQL_LANGUAGE = 'sql';

interface LanguageDefinition extends monacoTypes.languages.ILanguageExtensionPoint {
  loadLanguage?: (module: any) => Promise<void>;
  completionProvider?: (m: Monaco) => SQLCompletionItemProvider;
}

interface SQLEditorProps {
  query: string;
  onChange: (q: string) => void;
  language?: LanguageDefinition;
}

let INITIALIZED = false;

export const SQLEditor: React.FC<SQLEditorProps> = ({ onChange, query, language = { id: STANDARD_SQL_LANGUAGE } }) => {
  return (
    <CodeEditor
      height={'240px'}
      language={language.id}
      value={query}
      onBlur={onChange}
      showMiniMap={false}
      showLineNumbers={true}
      onBeforeEditorMount={(m: Monaco) => {
        registerLanguageAndSuggestions(m, language);
      }}
    />
  );
};

export const registerLanguageAndSuggestions = (monaco: Monaco, l: LanguageDefinition) => {
  // !!! One language id can be registeresd only once. We need to figure out a way to allow multiple languages to be registered
  // i.e. for scenario when there are multiple query editors for the same datasource
  if (INITIALIZED) {
    return;
  }

  const { id } = l;

  const languages = monaco.languages.getLanguages();

  if (languages.find((l) => l.id === id)) {
    if (l.completionProvider) {
      const customProvider = l.completionProvider(monaco);

      if (customProvider.supportedFunctions) {
        for (const func of customProvider.supportedFunctions()) {
          const exists = functionsRegistry.getIfExists(func.id);
          if (!exists) {
            functionsRegistry.register(func);
          }
        }
      }

      if (customProvider.customStatementPlacement) {
        for (const placement of customProvider.customStatementPlacement()) {
          const exists = statementPositionResolversRegistry.getIfExists(placement.id);
          if (!exists) {
            statementPositionResolversRegistry.register({
              ...placement,
              id: placement.id as StatementPosition,
              name: placement.id,
            });
            suggestionsKindRegistry.register({
              id: placement.id as StatementPosition,
              name: placement.id,
              kind: [],
            });
          }
        }
      }

      if (customProvider.customSuggestionKinds) {
        for (const kind of customProvider.customSuggestionKinds()) {
          kind.applyTo?.forEach((applyTo) => {
            const exists = suggestionsKindRegistry.getIfExists(applyTo);
            if (exists) {
              exists.kind.push(kind.id as SuggestionKind);
            }
          });

          stdSuggestionsRegistry.register({
            id: kind.id as SuggestionKind,
            name: kind.id,
            suggestions: kind.suggestionsResolver,
          });
        }
      }

      if (customProvider.resolveTables) {
        const stbBehaviour = stdSuggestionsRegistry.get(SuggestionKind.Tables);
        const s = stbBehaviour!.suggestions;
        stbBehaviour!.suggestions = async (a, b) => {
          const o = await s(a, b);
          const oo = (await customProvider.resolveTables!()).map((x) => ({
            label: x,
            kind: 1,
            insertText: x,
            sortText: CompletionItemPriority.High,
          }));
          return [...o, ...oo];
        };
      }

      if (customProvider.resolveColumns) {
        const stbBehaviour = stdSuggestionsRegistry.get(SuggestionKind.Columns);
        const s = stbBehaviour!.suggestions;
        stbBehaviour!.suggestions = async (ctx, m) => {
          const o = await s(ctx, m);
          const tableToken = getTableToken(ctx.currentToken);
          let oo: CustomSuggestion[] = [];
          if (tableToken && tableToken.value) {
            const columns = await customProvider.resolveColumns!(tableToken.value);
            oo = columns.map<CustomSuggestion>((x) => ({
              label: x.name,
              kind: m.languages.CompletionItemKind.Field,
              insertText: x.name,
              sortText: CompletionItemPriority.High,
            }));
          }
          return [...o, ...oo];
        };
      }

      const completionProvider: monacoTypes.languages.CompletionItemProvider['provideCompletionItems'] = async (
        model,
        position,
        context,
        token
      ) => {
        const currentToken = linkedTokenBuilder(monaco, model, position, 'sql');
        const statementPosition = getStatementPosition(currentToken);
        const kind = getSuggestionKinds(statementPosition);

        const ctx: PositionContext = {
          currentToken,
          statementPosition,
          kind,
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
          statementPosition,
          position,
          ctx
        );

        return {
          // ...ci,
          suggestions: [
            ...stdSuggestions,
            // , ...ci.suggestions
          ],
        };
      };

      monaco.languages.registerCompletionItemProvider(id, {
        ...customProvider,
        provideCompletionItems: completionProvider,
      });
    }
  } else {
    // TODO custom dialect support
    // monaco.languages.register({ id });
    //   loader().then(() => {
    //   monaco.languages.setMonarchTokensProvider(id, monarch.language);
    //   monaco.languages.setLanguageConfiguration(id, monarch.conf);
  }

  INITIALIZED = true;
};
