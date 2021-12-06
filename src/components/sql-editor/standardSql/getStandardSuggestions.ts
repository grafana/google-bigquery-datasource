import { Monaco, monacoTypes } from '@grafana/ui';
import { PositionContext } from '../types';
import { LinkedToken } from '../utils/LinkedToken';
import { toCompletionItem } from '../utils/toCompletionItem';
import { StatementPosition, SuggestionKind } from '../utils/types';
import { stdSuggestionsRegistry } from './registries';

// Given standard and custom registered suggestions and kinds of suggestion expected, return a list of completion items
export const getStandardSuggestions = async (
  monaco: Monaco,
  currentToken: LinkedToken | null,
  suggestionKinds: SuggestionKind[],
  statementPosition: StatementPosition[],
  position: monacoTypes.IPosition,
  positionContext: PositionContext
): Promise<monacoTypes.languages.CompletionItem[]> => {
  let suggestions: monacoTypes.languages.CompletionItem[] = [];
  const invalidRangeToken = currentToken?.isWhiteSpace() || currentToken?.isParenthesis();
  const range = invalidRangeToken || !currentToken?.range ? monaco.Range.fromPositions(position) : currentToken?.range;

  for (const suggestion of suggestionKinds) {
    const registeredSuggestions = stdSuggestionsRegistry.getIfExists(suggestion);
    if (registeredSuggestions) {
      const su = await registeredSuggestions.suggestions(positionContext, monaco);
      suggestions = [...suggestions, ...su.map((s) => toCompletionItem(s.label, range, { kind: s.kind, ...s }))];
    }
  }

  return Promise.resolve(suggestions);
};
