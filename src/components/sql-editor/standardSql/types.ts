import { RegistryItem } from '@grafana/data';
import { monacoTypes } from '@grafana/ui';
import { CustomSuggestion } from '../types';
import { LinkedToken } from '../utils/LinkedToken';
import { StatementPosition, SuggestionKind } from '../utils/types';

export interface SuggestionsRegistyItem extends RegistryItem {
  id: SuggestionKind;
  suggestions: (m: typeof monacoTypes) => Promise<CustomSuggestion[]>;
}
export interface FunctionsRegistryItem extends RegistryItem {}

type StatementPositionResolver = (
  currentToken: LinkedToken | null,
  previousKeyword: LinkedToken | null,
  previousNonWhiteSpace: LinkedToken | null,
  previousIsSlash: Boolean
) => Boolean;

export interface StatementPositionResolversRegistryItem extends RegistryItem {
  id: StatementPosition;
  resolve: StatementPositionResolver;
}
