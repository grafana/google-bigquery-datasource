import { getMonacoMock } from '../mocks/Monaco';
import { monacoTypes } from '@grafana/ui';
import { singleLineFullQuery } from '../mocks/testData';
import { linkedTokenBuilder } from '../utils/linkedTokenBuilder';
import { TextModel } from '../mocks/TextModel';
import { CustomVariableSupport, Registry } from '@grafana/data';
import { initStandardSuggestions } from './standardSuggestionsRegistry';
import { FunctionsRegistryItem, OperatorsRegistryItem, SuggestionsRegistyItem } from './types';
import { SuggestionKind } from '../utils/types';
import { getStandardSuggestions } from './getStandardSuggestions';
import { CustomSuggestion, PositionContext } from '../types';
describe('getStandardSuggestions', () => {
  const mockQueries = new Map<string, Array<Array<Pick<monacoTypes.Token, 'language' | 'offset' | 'type'>>>>();
  const cases = [{ query: singleLineFullQuery, position: { line: 1, column: 0 } }];
  cases.forEach((c) => mockQueries.set(c.query.query, c.query.tokens));
  const MonacoMock = getMonacoMock(mockQueries);
  const token = linkedTokenBuilder(MonacoMock, TextModel(singleLineFullQuery.query) as monacoTypes.editor.ITextModel, {
    lineNumber: 1,
    column: 0,
  });
  const posContextMock = {};

  it('calls the resolvers', async () => {
    const suggestionMock: CustomSuggestion = { label: 'customSuggest' };
    const resolveFunctionSpy = jest.fn().mockReturnValue([suggestionMock]);
    const kind = 'customSuggestionItemKind' as SuggestionKind;
    const suggestionsRegistry = new Registry<SuggestionsRegistyItem>(() => {
      return [
        {
          id: kind,
          name: 'customSuggestionItemKind',
          suggestions: resolveFunctionSpy,
        },
      ];
    });
    const result = await getStandardSuggestions(
      MonacoMock,
      token,
      [kind],
      posContextMock as PositionContext,
      suggestionsRegistry
    );

    expect(resolveFunctionSpy).toBeCalledTimes(1);
    expect(resolveFunctionSpy).toBeCalledWith({ range: token!.range }, MonacoMock);

    expect(result).toHaveLength(1);
    expect(result[0].label).toEqual(suggestionMock.label);
  });

  it('suggests select and select from', async () => {
    const suggestionsRegistry = new Registry(
      initStandardSuggestions(
        new Registry<FunctionsRegistryItem>(() => []),
        new Registry<OperatorsRegistryItem>(() => [])
      )
    );

    const result = await getStandardSuggestions(
      MonacoMock,
      token,
      [SuggestionKind.SelectKeyword],
      posContextMock as PositionContext,
      suggestionsRegistry
    );

    expect(result).toHaveLength(2);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "command": Object {
            "id": "editor.action.triggerSuggest",
            "title": "",
          },
          "insertText": "SELECT $0",
          "insertTextRules": 2,
          "kind": 2,
          "label": "SELECT <column>",
          "range": Object {
            "endColumn": 7,
            "endLineNumber": 1,
            "startColumn": 0,
            "startLineNumber": 1,
          },
          "sortText": "g",
        },
        Object {
          "command": Object {
            "id": "editor.action.triggerSuggest",
            "title": "",
          },
          "insertText": "SELECT $2 FROM $1",
          "insertTextRules": 2,
          "kind": 2,
          "label": "SELECT <column> FROM <table>>",
          "range": Object {
            "endColumn": 7,
            "endLineNumber": 1,
            "startColumn": 0,
            "startLineNumber": 1,
          },
          "sortText": "g",
        },
      ]
    `);
  });
});
