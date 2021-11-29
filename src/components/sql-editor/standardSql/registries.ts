import { Registry, RegistryItem } from '@grafana/data';
import { Monaco } from '@grafana/ui';
import { CustomSuggestion } from '../types';
import { TRIGGER_SUGGEST } from '../utils/misc';
import { SuggestionKind } from '../utils/types';
import { FROM, SELECT, STATISTICS } from './language';

// Standard suggestions registry, should work for a standard SQL query.
// Does not include all functions, only the most common ones.
// Consumer of the SQL editor should extend this registry with their own custom suggestions.
const initStandardSuggestions = (): SuggestionsRegistyItem[] => [
  {
    id: SuggestionKind.SelectKeyword,
    name: SuggestionKind.SelectKeyword,
    suggestions: (m) =>
      Promise.resolve([
        {
          label: SELECT,
          insertText: `${SELECT} $0`,
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          kind: m.languages.CompletionItemKind.Keyword,
          command: TRIGGER_SUGGEST,
        },
      ]),
  },
  {
    id: SuggestionKind.FunctionsWithArguments,
    name: SuggestionKind.FunctionsWithArguments,
    suggestions: (m) =>
      Promise.resolve([
        ...functionsRegistry.list().map((f) => ({
          label: f.name,
          insertText: `${f.name}($0)`,
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          kind: m.languages.CompletionItemKind.Function,
          command: TRIGGER_SUGGEST,
        })),
      ]),
  },
  {
    id: SuggestionKind.FunctionsWithoutArguments,
    name: SuggestionKind.FunctionsWithoutArguments,
    suggestions: (m) =>
      Promise.resolve([
        ...functionsRegistry.list().map((f) => ({
          label: f.name,
          insertText: `${f.name}()`,
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          kind: m.languages.CompletionItemKind.Function,
          command: TRIGGER_SUGGEST,
        })),
      ]),
  },
  {
    id: SuggestionKind.FromKeyword,
    name: SuggestionKind.FromKeyword,
    suggestions: (m) =>
      Promise.resolve([
        {
          label: FROM,
          insertText: `${FROM} $0`,
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          kind: m.languages.CompletionItemKind.Keyword,
        },
      ]),
  },
];

const initFunctionsRegistry = (): FunctionsRegistryItem[] => [
  ...STATISTICS.map((s) => ({
    id: s,
    name: s,
  })),
];

export interface SuggestionsRegistyItem extends RegistryItem {
  id: SuggestionKind;
  suggestions: (m: Monaco) => Promise<CustomSuggestion[]>;
}

export const stdSuggestionsRegistry = new Registry<SuggestionsRegistyItem>();
stdSuggestionsRegistry.setInit(initStandardSuggestions);

export interface FunctionsRegistryItem extends RegistryItem {}

export const functionsRegistry = new Registry<FunctionsRegistryItem>();
functionsRegistry.setInit(initFunctionsRegistry);

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

//   case SuggestionKind.FromKeyword:
//     addSuggestion(FROM, {
//       insertText: `${FROM} `,
//       command: TRIGGER_SUGGEST,
//     });
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

//   case SuggestionKind.LogicalOperators:
//     LOGICAL_OPERATORS.map((o) =>
//       addSuggestion(`${o}`, {
//         insertText: `${o} `,
//         command: TRIGGER_SUGGEST,
//         sortText: CompletionItemPriority.MediumHigh,
//       })
//     );
//     break;

//   case SuggestionKind.WhereKeyword:
//     addSuggestion(`${WHERE}`, {
//       insertText: `${WHERE} `,
//       command: TRIGGER_SUGGEST,
//       sortText: CompletionItemPriority.High,
//     });
//     break;

//   case SuggestionKind.ComparisonOperators:
//     COMPARISON_OPERATORS.map((o) => addSuggestion(`${o}`, { insertText: `${o} `, command: TRIGGER_SUGGEST }));
//     break;

//   case SuggestionKind.GroupByKeywords:
//     addSuggestion(`${GROUP} ${BY}`, {
//       insertText: `${GROUP} ${BY} `,
//       command: TRIGGER_SUGGEST,
//       sortText: CompletionItemPriority.MediumHigh,
//     });
//     break;

//   case SuggestionKind.OrderByKeywords:
//     addSuggestion(`${ORDER} ${BY}`, {
//       insertText: `${ORDER} ${BY} `,
//       command: TRIGGER_SUGGEST,
//       sortText: CompletionItemPriority.Medium,
//     });
//     break;

//   case SuggestionKind.LimitKeyword:
//     addSuggestion(LIMIT, { insertText: `${LIMIT} `, sortText: CompletionItemPriority.MediumLow });
//     break;

//   case SuggestionKind.SortOrderDirectionKeyword:
//     [ASC, DESC].map((s) =>
//       addSuggestion(s, {
//         insertText: `${s} `,
//         command: TRIGGER_SUGGEST,
//       })
//     );
//     break;
