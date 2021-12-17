import { Registry } from '@grafana/data';
import { TRIGGER_SUGGEST } from '../utils/commands';
import {
  CompletionItemInsertTextRule,
  CompletionItemKind,
  CompletionItemPriority,
  OperatorType,
  SuggestionKind,
} from '../types';
import {
  AS,
  ASC,
  BY,
  DESC,
  FROM,
  GROUP,
  LIMIT,
  LOGICAL_OPERATORS,
  ORDER,
  SELECT,
  STD_OPERATORS,
  STD_STATS,
  WHERE,
  WITH,
} from './language';
import { FunctionsRegistryItem, OperatorsRegistryItem, SuggestionsRegistyItem } from './types';

/**
 * This registry glues particular SuggestionKind with an async function that provides completion items for it.
 * To add a new suggestion kind, SQLEditor should be configured with a provider that implements customSuggestionKinds.
 */

export const initStandardSuggestions =
  (functions: Registry<FunctionsRegistryItem>, operators: Registry<OperatorsRegistryItem>) =>
  (): SuggestionsRegistyItem[] =>
    [
      {
        id: SuggestionKind.SelectKeyword,
        name: SuggestionKind.SelectKeyword,
        suggestions: (_, m) =>
          Promise.resolve([
            {
              label: `${SELECT} <column>`,
              insertText: `${SELECT} $0`,
              insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
              kind: CompletionItemKind.Snippet,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.Medium,
            },
            {
              label: `${SELECT} <column> ${FROM} <table>>`,
              insertText: `${SELECT} $2 ${FROM} $1`,
              insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
              kind: CompletionItemKind.Snippet,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.Medium,
            },
          ]),
      },
      {
        id: SuggestionKind.WithKeyword,
        name: SuggestionKind.WithKeyword,
        suggestions: (_, m) =>
          Promise.resolve([
            {
              label: `${WITH} <alias> ${AS} ( ... )`,
              insertText: `${WITH} $1  ${AS} ( $2 )`,
              insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
              kind: CompletionItemKind.Snippet,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.Medium,
            },
          ]),
      },
      {
        id: SuggestionKind.FunctionsWithArguments,
        name: SuggestionKind.FunctionsWithArguments,
        suggestions: (_, m) =>
          Promise.resolve([
            ...functions.list().map((f) => ({
              label: f.name,
              insertText: `${f.name}($0)`,
              insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
              kind: CompletionItemKind.Function,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.MediumHigh,
            })),
          ]),
      },
      {
        id: SuggestionKind.FunctionsWithoutArguments,
        name: SuggestionKind.FunctionsWithoutArguments,
        suggestions: (_, m) =>
          Promise.resolve([
            ...functions.list().map((f) => ({
              label: f.name,
              insertText: `${f.name}()`,
              insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
              kind: CompletionItemKind.Function,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.MediumHigh,
            })),
          ]),
      },
      {
        id: SuggestionKind.FromKeyword,
        name: SuggestionKind.FromKeyword,
        suggestions: (_, m) =>
          Promise.resolve([
            {
              label: FROM,
              insertText: `${FROM} $0`,
              insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
              kind: CompletionItemKind.Keyword,
            },
          ]),
      },
      {
        id: SuggestionKind.Tables,
        name: SuggestionKind.Tables,
        suggestions: (_, m) => Promise.resolve([]),
      },
      {
        id: SuggestionKind.Columns,
        name: SuggestionKind.Columns,
        suggestions: (_, m) => Promise.resolve([]),
      },
      {
        id: SuggestionKind.LogicalOperators,
        name: SuggestionKind.LogicalOperators,
        suggestions: (_, m) =>
          Promise.resolve(
            operators
              .list()
              .filter((o) => o.type === OperatorType.Logical)
              .map((o) => ({
                label: o.operator,
                insertText: `${o.operator} `,
                command: TRIGGER_SUGGEST,
                sortText: CompletionItemPriority.High,
                kind: CompletionItemKind.Operator,
              }))
          ),
      },
      {
        id: SuggestionKind.WhereKeyword,
        name: SuggestionKind.WhereKeyword,
        suggestions: (_, m) =>
          Promise.resolve([
            {
              label: WHERE,
              insertText: `${WHERE} `,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.MediumHigh,
              kind: CompletionItemKind.Keyword,
            },
          ]),
      },
      {
        id: SuggestionKind.ComparisonOperators,
        name: SuggestionKind.ComparisonOperators,
        suggestions: (_, m) =>
          Promise.resolve(
            operators
              .list()
              .filter((o) => o.type === OperatorType.Comparison)
              .map((o) => ({
                label: o.operator,
                insertText: `${o.operator} `,
                command: TRIGGER_SUGGEST,
                sortText: CompletionItemPriority.High,
                kind: CompletionItemKind.Operator,
              }))
          ),
      },
      {
        id: SuggestionKind.GroupByKeywords,
        name: SuggestionKind.GroupByKeywords,
        suggestions: (_, m) =>
          Promise.resolve([
            {
              label: 'GROUP BY',
              insertText: `${GROUP} ${BY} `,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.MediumHigh,
              kind: CompletionItemKind.Keyword,
            },
          ]),
      },
      {
        id: SuggestionKind.OrderByKeywords,
        name: SuggestionKind.OrderByKeywords,
        suggestions: (_, m) =>
          Promise.resolve([
            {
              label: 'ORDER BY',
              insertText: `${ORDER} ${BY} `,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.Medium,
              kind: CompletionItemKind.Keyword,
            },
          ]),
      },
      {
        id: SuggestionKind.LimitKeyword,
        name: SuggestionKind.LimitKeyword,
        suggestions: (_, m) =>
          Promise.resolve([
            {
              label: 'LIMIT',
              insertText: `${LIMIT} `,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.MediumLow,
              kind: CompletionItemKind.Keyword,
            },
          ]),
      },
      {
        id: SuggestionKind.SortOrderDirectionKeyword,
        name: SuggestionKind.SortOrderDirectionKeyword,
        suggestions: (_, m) =>
          Promise.resolve(
            [ASC, DESC].map((o) => ({
              label: o,
              insertText: `${o} `,
              command: TRIGGER_SUGGEST,
              kind: CompletionItemKind.Keyword,
            }))
          ),
      },
    ];

export const initFunctionsRegistry = (): FunctionsRegistryItem[] => [
  ...STD_STATS.map((s) => ({
    id: s,
    name: s,
  })),
];

export const initOperatorsRegistry = (): OperatorsRegistryItem[] => [
  ...STD_OPERATORS.map((o) => ({
    id: o,
    name: o,
    operator: o,
    type: OperatorType.Comparison,
  })),
  ...LOGICAL_OPERATORS.map((o) => ({ id: o, name: o, operator: o, type: OperatorType.Logical })),
];
