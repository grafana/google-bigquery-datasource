import { CodeEditor, Monaco, monacoTypes } from '@grafana/ui';
import React from 'react';
import { getStatementPosition } from './standardSql/getStatementPosition';
import { functionsRegistry, stdSuggestionsRegistry } from './standardSql/registries';
import { getStandardSuggestions } from './standardSql/getStandardSuggestions';
import { suggestionsKindRegistry } from './standardSql/suggestionsKindRegistry';
import { SQLCompletionItemProvider } from './types';
import { getSuggestionKinds } from './utils/getSuggestionKind';
import { linkedTokenBuilder } from './utils/linkedTokenBuilder';
import { SuggestionKind } from './utils/types';

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

      if (customProvider.customFunctions) {
        for (const func of customProvider.customFunctions()) {
          functionsRegistry.register(func);
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

      const completionProvider: monacoTypes.languages.CompletionItemProvider['provideCompletionItems'] = async (
        model,
        position,
        context,
        token
      ) => {
        const currentToken = linkedTokenBuilder(monaco, model, position, 'sql');
        const statementPosition = getStatementPosition(currentToken);
        const kind = getSuggestionKinds(statementPosition);

        const ci = customProvider.provideCompletionItems(model, position, context, token, {
          currentToken,
          statementPosition,
          kind,
        });

        console.log('completionProvider', statementPosition, kind);
        const stdSuggestions = await getStandardSuggestions(monaco, currentToken, kind, statementPosition, position);
        return {
          ...ci,
          suggestions: [...stdSuggestions, ...ci.suggestions],
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
