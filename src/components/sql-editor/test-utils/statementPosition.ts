import { Registry } from '@grafana/data';
import { monacoTypes } from '@grafana/ui';
import { getMonacoMock } from '../mocks/Monaco';
import { TextModel } from '../mocks/TextModel';
import { getStatementPosition } from '../standardSql/getStatementPosition';
import { StatementPositionResolversRegistryItem } from '../standardSql/types';
import { CustomStatementPlacement, StatementPosition } from '../types';
import { linkedTokenBuilder } from '../utils/linkedTokenBuilder';
import { TestQueryModel } from './types';

interface StatementPositionResolverTestCase {
  query: TestQueryModel;
  position: { line: number; column: number };
}

function assertPosition(
  query: string,
  position: monacoTypes.IPosition,
  expected: StatementPosition | string,
  monacoMock: any,
  resolversRegistry: Registry<StatementPositionResolversRegistryItem>
) {
  const testModel = TextModel(query);
  const current = linkedTokenBuilder(monacoMock, testModel as monacoTypes.editor.ITextModel, position);
  const statementPosition = getStatementPosition(current, resolversRegistry);

  expect(statementPosition).toContain(expected);
}

export const testStatementPosition = (
  expected: StatementPosition | string,
  cases: Array<StatementPositionResolverTestCase>,
  resolvers: () => CustomStatementPlacement[]
) => {
  describe(`${expected}`, () => {
    let MonacoMock: any;
    let statementPositionResolversRegistry: Registry<StatementPositionResolversRegistryItem>;

    beforeEach(() => {
      const mockQueries = new Map<string, Pick<monacoTypes.Token, 'language' | 'offset' | 'type'>[][]>();
      cases.forEach((c) => mockQueries.set(c.query.query, c.query.tokens));

      MonacoMock = getMonacoMock(mockQueries);
      statementPositionResolversRegistry = new Registry(() => {
        return resolvers().map((r) => ({
          id: r.id as StatementPosition,
          name: r.name || r.id,
          resolve: r.resolve,
        }));
      });
    });

    // using forEach here rather than test.each as been struggling to get the arguments intepolated in test name string
    cases.forEach((c) => {
      test(`${c.query.query}`, () => {
        assertPosition(
          c.query.query,
          { lineNumber: c.position.line, column: c.position.column },
          expected,
          MonacoMock,
          statementPositionResolversRegistry
        );
      });
    });
  });
};
