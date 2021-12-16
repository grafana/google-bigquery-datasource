import { SQLEditorTestUtils } from 'components/sql-editor/test-utils';
import { customStatementPlacement, CustomStatementPlacement } from './bigqueryCompletionProvider';
import { simpleBigQueryQuery } from './testData/simpleBigQueryQuery';

describe('Custom statement position resolvers', () => {
  SQLEditorTestUtils.testStatementPosition(
    CustomStatementPlacement.AfterDataset,
    [
      {
        query: simpleBigQueryQuery,
        position: { line: 1, column: 34 },
      },
      {
        query: simpleBigQueryQuery,
        position: { line: 1, column: 53 },
      },
    ],
    customStatementPlacement
  );
});
