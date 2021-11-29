import { Monaco, monacoTypes } from '@grafana/ui';
import { LinkedToken } from './utils/LinkedToken';
import { StatementPosition, SuggestionKind } from './utils/types';

export interface PositionContext {
  kind: SuggestionKind[];
  statementPosition: StatementPosition;
  currentToken: LinkedToken | null;
}

// Better name needed
export type CustomSuggestion = Partial<monacoTypes.languages.CompletionItem> & { label: string };

export interface CustomSuggestionKind {
  id: string;
  suggestionsResolver: () => Promise<CustomSuggestion[]>;
  applyTo?: StatementPosition[];
}

export interface SQLCompletionItemProvider
  extends Omit<monacoTypes.languages.CompletionItemProvider, 'provideCompletionItems'> {
  provideCompletionItems: (
    model: monacoTypes.editor.ITextModel,
    position: monacoTypes.Position,
    context: monacoTypes.languages.CompletionContext,
    token: monacoTypes.CancellationToken,
    positionContext: PositionContext // Decorates original provideCompletionItems function with our custom statement position context
  ) => monacoTypes.languages.CompletionList;

  // Allows dialect specific functions to be added to the completion list
  customFunctions?: () => Array<{
    id: string;
    name: string;
  }>;

  // Allows
  customSuggestionKinds?: () => CustomSuggestionKind[];
}
export type LanguageCompletionProvider = (m: Monaco) => SQLCompletionItemProvider;

export enum CompletionItemPriority {
  High = 'a',
  MediumHigh = 'd',
  Medium = 'g',
  MediumLow = 'k',
  Low = 'q',
}
