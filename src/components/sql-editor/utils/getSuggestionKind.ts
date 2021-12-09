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
    try {
      k = suggestionsKindRegistry.get(statementPosition[i]);
    } catch (e) {
      console.error(e);
    }

    if (k) {
      result = result.concat(k.kind);
    }
  }

  return result;
}
