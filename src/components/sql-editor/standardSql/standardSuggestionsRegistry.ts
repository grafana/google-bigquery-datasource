// Standard suggestions registry, should work for a standard SQL query.
// Does not include all functions, only the most common ones.

import { Registry } from '@grafana/data';
import { TRIGGER_SUGGEST } from '../utils/misc';
import { CompletionItemPriority, OperatorType, SuggestionKind } from '../utils/types';
import { AS, ASC, BY, DESC, FROM, GROUP, LIMIT, ORDER, SELECT, STD_STATS, WHERE, WITH } from './language';
import { FunctionsRegistryItem, OperatorsRegistryItem, SuggestionsRegistyItem } from './types';

// Consumer of the SQL editor should extend this registry with their own custom suggestions.
export const initStandardSuggestions =
  (functions: Registry<FunctionsRegistryItem>, operators: Registry<OperatorsRegistryItem>) =>
  (): SuggestionsRegistyItem[] =>
    [
      {
        id: SuggestionKind.SelectKeyword,
        name: SuggestionKind.SelectKeyword,
        suggestions: (_, m) =>
          (console.log(m) as any) ||
          Promise.resolve([
            {
              label: `${SELECT} <column>`,
              insertText: `${SELECT} $0`,
              insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              kind: m.languages.CompletionItemKind.Snippet,
              command: TRIGGER_SUGGEST,
              sortText: CompletionItemPriority.Medium,
            },
            {
              label: `${SELECT} <column> ${FROM} <table>>`,
              insertText: `${SELECT} $2 ${FROM} $1`,
              insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              kind: m.languages.CompletionItemKind.Snippet,
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
              insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              kind: m.languages.CompletionItemKind.Snippet,
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
              insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              kind: m.languages.CompletionItemKind.Function,
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
              insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              kind: m.languages.CompletionItemKind.Function,
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
              insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              kind: m.languages.CompletionItemKind.Keyword,
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
              sortText: CompletionItemPriority.High,
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

// some std operators...?
export const initOperatorsRegistry = (): OperatorsRegistryItem[] => [];

// Cloudwatch specific below
//   case SuggestionKind.Metrics:
//     {
//       const namespaceToken = getNamespaceToken(currentToken);
//       if (namespaceToken?.value) {
//         // if a namespace is specified, only suggest metrics for the namespace
//         const metrics = await this.datasource.getMetrics(
//           this.templateSrv.replace(namespaceToken?.value.replace(/\"/g, '')),
//           this.templateSrv.replace(this.region)
//         );
//         metrics.map((m) => addSuggestion(m.value));
//       } else {
//         // If no namespace is specified in the query, just list all metrics
//         const metrics = await this.datasource.getAllMetrics(this.templateSrv.replace(this.region));
//         uniq(metrics.map((m) => m.metricName)).map((m) => addSuggestion(m, { insertText: m }));
//       }
//     }
//     break;

//   case SuggestionKind.SchemaKeyword:
//     addSuggestion(SCHEMA, {
//       sortText: CompletionItemPriority.High,
//       insertText: `${SCHEMA}($0)`,
//       insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
//       command: TRIGGER_SUGGEST,
//       kind: monaco.languages.CompletionItemKind.Function,
//     });
//     break;

//   case SuggestionKind.Namespaces:
//     const metricNameToken = getMetricNameToken(currentToken);
//     let namespaces = [];
//     if (metricNameToken?.value) {
//       // if a metric is specified, only suggest namespaces that actually have that metric
//       const metrics = await this.datasource.getAllMetrics(this.region);
//       const metricName = this.templateSrv.replace(metricNameToken.value);
//       namespaces = metrics.filter((m) => m.metricName === metricName).map((m) => m.namespace);
//     } else {
//       // if no metric is specified, just suggest all namespaces
//       const ns = await this.datasource.getNamespaces();
//       namespaces = ns.map((n) => n.value);
//     }
//     namespaces.map((n) => addSuggestion(`"${n}"`, { insertText: `"${n}"` }));
//     break;

//   case SuggestionKind.LabelKeys:
//     {
//       const metricNameToken = getMetricNameToken(currentToken);
//       const namespaceToken = getNamespaceToken(currentToken);
//       if (namespaceToken?.value) {
//         let dimensionFilter = {};
//         let labelKeyTokens;
//         if (statementPosition === StatementPosition.SchemaFuncExtraArgument) {
//           labelKeyTokens = namespaceToken?.getNextUntil(TokenType.Parenthesis, [
//             TokenType.Delimiter,
//             TokenType.Whitespace,
//           ]);
//         } else if (statementPosition === StatementPosition.AfterGroupByKeywords) {
//           labelKeyTokens = currentToken?.getPreviousUntil(TokenType.Keyword, [
//             TokenType.Delimiter,
//             TokenType.Whitespace,
//           ]);
//         }
//         dimensionFilter = (labelKeyTokens || []).reduce((acc, curr) => {
//           return { ...acc, [curr.value]: null };
//         }, {});
//         const keys = await this.datasource.getDimensionKeys(
//           this.templateSrv.replace(namespaceToken.value.replace(/\"/g, '')),
//           this.templateSrv.replace(this.region),
//           dimensionFilter,
//           metricNameToken?.value ?? ''
//         );
//         keys.map((m) => {
//           const key = /[\s\.-]/.test(m.value) ? `"${m.value}"` : m.value;
//           addSuggestion(key);
//         });
//       }
//     }
//     break;

//   case SuggestionKind.LabelValues:
//     {
//       const namespaceToken = getNamespaceToken(currentToken);
//       const metricNameToken = getMetricNameToken(currentToken);
//       const labelKey = currentToken?.getPreviousNonWhiteSpaceToken()?.getPreviousNonWhiteSpaceToken();
//       if (namespaceToken?.value && labelKey?.value && metricNameToken?.value) {
//         const values = await this.datasource.getDimensionValues(
//           this.templateSrv.replace(this.region),
//           this.templateSrv.replace(namespaceToken.value.replace(/\"/g, '')),
//           this.templateSrv.replace(metricNameToken.value),
//           this.templateSrv.replace(labelKey.value),
//           {}
//         );
//         values.map((o) =>
//           addSuggestion(`'${o.value}'`, { insertText: `'${o.value}' `, command: TRIGGER_SUGGEST })
//         );
//       }
//     }
//     break;
