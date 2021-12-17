import { Registry } from '@grafana/data';
import { Monaco, monacoTypes } from '@grafana/ui';
import { PositionContext, SuggestionKind } from '../types';
import { LinkedToken } from '../utils/LinkedToken';
import { toCompletionItem } from '../utils/toCompletionItem';
import { SuggestionsRegistyItem } from './types';

// Given standard and custom registered suggestions and kinds of suggestion expected, return a list of completion items
export const getStandardSuggestions = async (
  monaco: Monaco,
  currentToken: LinkedToken | null,
  suggestionKinds: SuggestionKind[],
  positionContext: PositionContext,
  suggestionsRegistry: Registry<SuggestionsRegistyItem>
): Promise<monacoTypes.languages.CompletionItem[]> => {
  let suggestions: monacoTypes.languages.CompletionItem[] = [];
  const invalidRangeToken = currentToken?.isWhiteSpace() || currentToken?.isParenthesis();
  const range =
    invalidRangeToken || !currentToken?.range
      ? monaco.Range.fromPositions(positionContext.position)
      : currentToken?.range;

  for (const suggestion of suggestionKinds) {
    const registeredSuggestions = suggestionsRegistry.getIfExists(suggestion);
    if (registeredSuggestions) {
      const su = await registeredSuggestions.suggestions({ ...positionContext, range }, monaco);
      suggestions = [...suggestions, ...su.map((s) => toCompletionItem(s.label, range, { kind: s.kind, ...s }))];
    }
  }

  return Promise.resolve(suggestions);
};
