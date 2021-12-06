import { Registry, RegistryItem } from '@grafana/data';
import { StatementPosition, SuggestionKind } from '../utils/types';

interface SuggestionKindRegistyItem extends RegistryItem {
  kind: SuggestionKind[];
  id: StatementPosition;
}
export const suggestionsKindRegistry = new Registry<SuggestionKindRegistyItem>();

// Registry of possible suggestions for the given statement position
suggestionsKindRegistry.setInit(() => {
  return [
    {
      id: StatementPosition.SelectKeyword,
      name: StatementPosition.SelectKeyword,
      kind: [SuggestionKind.SelectKeyword],
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
      kind: [SuggestionKind.Namespaces, SuggestionKind.SchemaKeyword, SuggestionKind.Tables],
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
      id: StatementPosition.WhereKey,
      name: StatementPosition.WhereKey,
      kind: [SuggestionKind.LabelKeys],
    },
    {
      id: StatementPosition.WhereComparisonOperator,
      name: StatementPosition.WhereComparisonOperator,
      kind: [SuggestionKind.ComparisonOperators],
    },
    {
      id: StatementPosition.WhereValue,
      name: StatementPosition.WhereValue,
      kind: [SuggestionKind.LabelValues],
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
      kind: [SuggestionKind.LabelKeys],
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

    // cw specific?
    {
      id: StatementPosition.SchemaFuncFirstArgument,
      name: StatementPosition.SchemaFuncFirstArgument,
      kind: [SuggestionKind.Namespaces],
    },
    {
      id: StatementPosition.SchemaFuncExtraArgument,
      name: StatementPosition.SchemaFuncExtraArgument,
      kind: [SuggestionKind.LabelKeys],
    },
    // cw specific?
  ];
});
