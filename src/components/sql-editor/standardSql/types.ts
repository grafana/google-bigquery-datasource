import { RegistryItem } from '@grafana/data';
import { monacoTypes } from '@grafana/ui';
import { CustomSuggestion, PositionContext } from '../types';
import { LinkedToken } from '../utils/LinkedToken';
import { OperatorType, StatementPosition, SuggestionKind } from '../utils/types';

export interface SuggestionsRegistyItem extends RegistryItem {
  id: SuggestionKind;
  suggestions: (position: PositionContext, m: typeof monacoTypes) => Promise<CustomSuggestion[]>;
}
export interface FunctionsRegistryItem extends RegistryItem {}
export interface OperatorsRegistryItem extends RegistryItem {
  operator: string;
  type: OperatorType;
}

export type StatementPositionResolver = (
  currentToken: LinkedToken | null,
  previousKeyword: LinkedToken | null,
  previousNonWhiteSpace: LinkedToken | null,
  previousIsSlash: Boolean
) => Boolean;

export interface StatementPositionResolversRegistryItem extends RegistryItem {
  id: StatementPosition;
  resolve: StatementPositionResolver;
}

export type SuggestionsResolver = <T extends PositionContext = PositionContext>(
  positionContext: T
) => Promise<CustomSuggestion[]>;
