import { RegistryItem } from '@grafana/data';
import { StatementPosition, SuggestionKind } from '../types';

export interface SuggestionKindRegistyItem extends RegistryItem {
  id: StatementPosition;
  kind: SuggestionKind[];
}

// Registry of possible suggestions for the given statement position
export const initSuggestionsKindRegistry = (): SuggestionKindRegistyItem[] => {
  return [
    {
      id: StatementPosition.SelectKeyword,
      name: StatementPosition.SelectKeyword,
      kind: [SuggestionKind.SelectKeyword],
    },
    {
      id: StatementPosition.WithKeyword,
      name: StatementPosition.WithKeyword,
      kind: [SuggestionKind.WithKeyword],
    },
    {
      id: StatementPosition.AfterSelectKeyword,
      name: StatementPosition.AfterSelectKeyword,
      kind: [SuggestionKind.FunctionsWithArguments, SuggestionKind.Columns],
    },
    {
      id: StatementPosition.AfterSelectFuncFirstArgument,
      name: StatementPosition.AfterSelectFuncFirstArgument,
      kind: [SuggestionKind.Columns],
    },
    {
      id: StatementPosition.AfterSelectArguments,
      name: StatementPosition.AfterSelectArguments,
      kind: [SuggestionKind.Columns],
    },
    {
      id: StatementPosition.AfterFromKeyword,
      name: StatementPosition.AfterFromKeyword,
      kind: [SuggestionKind.Tables],
    },
    {
      id: StatementPosition.FromKeyword,
      name: StatementPosition.FromKeyword,
      kind: [SuggestionKind.FromKeyword],
    },
    {
      id: StatementPosition.AfterFrom,
      name: StatementPosition.AfterFrom,
      kind: [
        SuggestionKind.WhereKeyword,
        SuggestionKind.GroupByKeywords,
        SuggestionKind.OrderByKeywords,
        SuggestionKind.LimitKeyword,
        SuggestionKind.Tables,
      ],
    },
    {
      id: StatementPosition.AfterTable,
      name: StatementPosition.AfterTable,
      kind: [
        SuggestionKind.WhereKeyword,
        SuggestionKind.GroupByKeywords,
        SuggestionKind.OrderByKeywords,
        SuggestionKind.LimitKeyword,
      ],
    },

    {
      id: StatementPosition.WhereKeyword,
      name: StatementPosition.WhereKeyword,
      kind: [],
    },
    {
      id: StatementPosition.WhereComparisonOperator,
      name: StatementPosition.WhereComparisonOperator,
      kind: [SuggestionKind.ComparisonOperators],
    },
    {
      id: StatementPosition.WhereValue,
      name: StatementPosition.WhereValue,
      kind: [],
    },
    {
      id: StatementPosition.AfterWhereValue,
      name: StatementPosition.AfterWhereValue,
      kind: [
        SuggestionKind.LogicalOperators,
        SuggestionKind.GroupByKeywords,
        SuggestionKind.OrderByKeywords,
        SuggestionKind.LimitKeyword,
      ],
    },
    {
      id: StatementPosition.AfterGroupByKeywords,
      name: StatementPosition.AfterGroupByKeywords,
      kind: [],
    },
    {
      id: StatementPosition.AfterGroupBy,
      name: StatementPosition.AfterGroupBy,
      kind: [SuggestionKind.OrderByKeywords, SuggestionKind.LimitKeyword],
    },
    {
      id: StatementPosition.AfterOrderByKeywords,
      name: StatementPosition.AfterOrderByKeywords,
      kind: [SuggestionKind.Columns],
    },
    {
      id: StatementPosition.AfterOrderByFunction,
      name: StatementPosition.AfterOrderByFunction,
      kind: [SuggestionKind.SortOrderDirectionKeyword, SuggestionKind.LimitKeyword],
    },
    {
      id: StatementPosition.AfterOrderByDirection,
      name: StatementPosition.AfterOrderByDirection,
      kind: [SuggestionKind.LimitKeyword],
    },
  ];
};
