import { FieldType } from '@grafana/data';
import { Monaco, monacoTypes } from '@grafana/ui';
import { StatementPositionResolver, SuggestionsResolver } from './standardSql/types';
import { LinkedToken } from './utils/LinkedToken';
import { StatementPosition, SuggestionKind } from './utils/types';

export interface PositionContext {
  kind: SuggestionKind[];
  statementPosition: StatementPosition[];
  currentToken: LinkedToken | null;
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
  resolve: StatementPositionResolver;
}

export interface ColumnSchema {
  name: string;
  type?: FieldType;
}

export interface SQLCompletionItemProvider
  extends Omit<monacoTypes.languages.CompletionItemProvider, 'provideCompletionItems'> {
  /**
   * Allows dialect specific functions to be added to the completion list
   * @alpha
   */
  supportedFunctions?: () => Array<{
    id: string;
    name: string;
  }>;

  /**
   * Allows custom suggestion kinds to be defined and correlate them with <Custom>StatementPosition
   * @alpha
   */
  customSuggestionKinds?: () => CustomSuggestionKind[];

  /**
   * Allows custom statement placement definition
   * @alpha
   */
  customStatementPlacement?: () => CustomStatementPlacement[];

  resolveTables?: () => Promise<string[]>;
  resolveColumns?: (table: string) => Promise<ColumnSchema[]>;

  provideCompletionItems?: (
    model: monacoTypes.editor.ITextModel,
    position: monacoTypes.Position,
    context: monacoTypes.languages.CompletionContext,
    token: monacoTypes.CancellationToken,
    positionContext: PositionContext // Decorates original provideCompletionItems function with our custom statement position context
  ) => monacoTypes.languages.CompletionList;
  // Some higher order schema type here..?
  // resolveSchema?: () => Promise<any>;
}
export type LanguageCompletionProvider = (m: Monaco) => SQLCompletionItemProvider;

export enum CompletionItemPriority {
  High = 'a',
  MediumHigh = 'd',
  Medium = 'g',
  MediumLow = 'k',
  Low = 'q',
}
