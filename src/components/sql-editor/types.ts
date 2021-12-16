import { FieldType } from '@grafana/data';
import { Monaco, monacoTypes } from '@grafana/ui';
import { StatementPositionResolver, SuggestionsResolver } from './standardSql/types';
import { LinkedToken } from './utils/LinkedToken';
import { OperatorType, StatementPosition, SuggestionKind } from './utils/types';

export interface PositionContext {
  position: monacoTypes.IPosition;
  kind: SuggestionKind[];
  statementPosition: StatementPosition[];
  currentToken: LinkedToken | null;
  range: monacoTypes.IRange;
}

// Better name needed
export type CustomSuggestion = Partial<monacoTypes.languages.CompletionItem> & { label: string };

export interface CustomSuggestionKind {
  id: string;
  suggestionsResolver: SuggestionsResolver;
  applyTo?: (StatementPosition | string)[];
}

export interface CustomStatementPlacement {
  id: string;
  name?: string;
  resolve: StatementPositionResolver;
}
export type CustomStatementPlacementProvider = () => CustomStatementPlacement[];
export type CustomSuggestionKindProvider = () => CustomSuggestionKind[];

export interface ColumnDefinition {
  name: string;
  type?: FieldType;
  // Text used for automplete, if not provided name is used
  completion?: string;
}
export interface TableDefinition {
  name: string;
  // Text used for automplete, if not provided name is used
  completion?: string;
}

export interface SQLCompletionItemProvider
  extends Omit<monacoTypes.languages.CompletionItemProvider, 'provideCompletionItems'> {
  /**
   * Allows dialect specific functions to be added to the completion list.
   * @alpha
   */
  supportedFunctions?: () => Array<{
    id: string;
    name: string;
  }>;

  /**
   * Allows dialect specific operators to be added to the completion list.
   * @alpha
   */
  supportedOperators?: () => Array<{
    id: string;
    operator: string;
    type: OperatorType;
  }>;

  /**
   * Allows custom suggestion kinds to be defined and correlate them with <Custom>StatementPosition.
   * @alpha
   */
  customSuggestionKinds?: CustomSuggestionKindProvider;

  /**
   * Allows custom statement placement definition.
   * @alpha
   */
  customStatementPlacement?: CustomStatementPlacementProvider;

  /**
   * Allows providing a custom function for resolving db tables.
   * It's up to the consumer to decide whether the columns are resolved via API calls or preloaded in the query editor(i.e. full db schema is preloades loaded).
   * @alpha
   */
  tables?: {
    resolve: () => Promise<TableDefinition[]>;
    // Allows providing a custom function for calculating the table name from the query. If not specified a default implemnentation is used.
    parseName?: (t: LinkedToken) => string;
  };
  /**
   * Allows providing a custom function for resolving table.
   * It's up to the consumer to decide whether the columns are resolved via API calls or preloaded in the query editor(i.e. full db schema is preloades loaded).
   * @alpha
   */
  columns?: {
    resolve: (table: string) => Promise<ColumnDefinition[]>;
  };

  /**
   * TODO: Not sure whether or not we need this. Would like to avoid this kind of flexibility.
   * @alpha
   */
  provideCompletionItems?: (
    model: monacoTypes.editor.ITextModel,
    position: monacoTypes.Position,
    context: monacoTypes.languages.CompletionContext,
    token: monacoTypes.CancellationToken,
    positionContext: PositionContext // Decorates original provideCompletionItems function with our custom statement position context
  ) => monacoTypes.languages.CompletionList;
}

export type LanguageCompletionProvider = (m: Monaco) => SQLCompletionItemProvider;

export enum CompletionItemPriority {
  High = 'a',
  MediumHigh = 'd',
  Medium = 'g',
  MediumLow = 'k',
  Low = 'q',
}
