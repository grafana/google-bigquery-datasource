import { suggestionsKindRegistry } from '../standardSql/suggestionsKindRegistry';
import { StatementPosition, SuggestionKind } from './types';

export function getSuggestionKinds(statementPosition: StatementPosition): SuggestionKind[] {
  let k;

  try {
    k = suggestionsKindRegistry.get(statementPosition);
  } catch (e) {
    console.error(e);
  }

  if (k) {
    return k.kind;
  }

  return [];
}
