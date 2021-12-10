import { Registry } from '@grafana/data';
import { SuggestionKindRegistyItem } from '../standardSql/suggestionsKindRegistry';
import { StatementPosition, SuggestionKind } from './types';

export function getSuggestionKinds(
  statementPosition: StatementPosition[],
  suggestionsKindRegistry: Registry<SuggestionKindRegistyItem>
): SuggestionKind[] {
  let k;

  let result: SuggestionKind[] = [];
  for (let i = 0; i < statementPosition.length; i++) {
    const exists = suggestionsKindRegistry.getIfExists(statementPosition[i]);
    if (exists) {
      result = result.concat(exists.kind);
    }
  }

  return result;
}
