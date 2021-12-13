import { monacoTypes } from '@grafana/ui';

// import {
//   multiLineFullQuery,
//   singleLineFullQuery,
//   singleLineEmptyQuery,
//   singleLineTwoQueries,
//   multiLineIncompleteQueryWithoutNamespace,
// } from './test-data';

// const TestData = {
//   [multiLineFullQuery.query]: multiLineFullQuery.tokens,
//   [singleLineFullQuery.query]: singleLineFullQuery.tokens,
//   [singleLineEmptyQuery.query]: singleLineEmptyQuery.tokens,
//   [singleLineTwoQueries.query]: singleLineTwoQueries.tokens,
//   [multiLineIncompleteQueryWithoutNamespace.query]: multiLineIncompleteQueryWithoutNamespace.tokens,
// };

// Stub for the Monaco instance. Only implements the parts that are used in cloudwatch sql
const getMonacoMock: (testData: Record<string, any>) => any = (testData) => ({
  editor: {
    tokenize: (value: string, languageId: string) => {
      return testData[value];
    },
  },
  Range: {
    containsPosition: (range: monacoTypes.IRange, position: monacoTypes.IPosition) => {
      return (
        position.lineNumber >= range.startLineNumber &&
        position.lineNumber <= range.endLineNumber &&
        position.column >= range.startColumn &&
        position.column <= range.endColumn
      );
    },
  },
});

export { getMonacoMock };
