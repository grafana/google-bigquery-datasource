import { Registry, RegistryItem } from '@grafana/data';
import { LinkedToken } from '../utils/LinkedToken';
import { StatementPosition, TokenType } from '../utils/types';
import { AND, ASC, BY, DESC, EQUALS, FROM, GROUP, NOT_EQUALS, ORDER, SCHEMA, SELECT, WHERE } from './language';

// Given current cursor position in the SQL editor, returns the statement position.
export function getStatementPosition(currentToken: LinkedToken | null): StatementPosition {
  const previousNonWhiteSpace = currentToken?.getPreviousNonWhiteSpaceToken();
  const previousKeyword = currentToken?.getPreviousKeyword();
  const previousIsSlash = currentToken?.getPreviousNonWhiteSpaceToken()?.is(TokenType.Operator, '/');

  const resolvers = statementPositionResolvers.list();

  for (const resolver of resolvers) {
    if (
      resolver.resolve(currentToken, previousKeyword ?? null, previousNonWhiteSpace ?? null, Boolean(previousIsSlash))
    ) {
      console.log(`Resolved statement position: ${resolver.id}`);
      return resolver.id;
    }
  }

  return StatementPosition.Unknown;
}

type StatementPositionResolver = (
  currentToken: LinkedToken | null,
  previousKeyword: LinkedToken | null,
  previousNonWhiteSpace: LinkedToken | null,
  previousIsSlash: Boolean
) => Boolean;

interface StatementPositionResolversRegistryItem extends RegistryItem {
  id: StatementPosition;
  resolve: StatementPositionResolver;
}

const statementPositionResolvers = new Registry<StatementPositionResolversRegistryItem>();
statementPositionResolvers.setInit(initStatementPositionResolers);

function initStatementPositionResolers(): StatementPositionResolversRegistryItem[] {
  return [
    {
      id: StatementPosition.SelectKeyword,
      name: StatementPosition.SelectKeyword,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          currentToken === null ||
            (currentToken.isWhiteSpace() && currentToken.previous === null) ||
            (currentToken.is(TokenType.Keyword, SELECT) && currentToken.previous === null) ||
            previousIsSlash ||
            (currentToken.isIdentifier() && (previousIsSlash || currentToken?.previous === null))
        ),
    },
    {
      id: StatementPosition.AfterSelectKeyword,
      name: StatementPosition.AfterSelectKeyword,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(previousNonWhiteSpace?.value === SELECT),
    },
    {
      id: StatementPosition.AfterSelectFuncFirstArgument,
      name: StatementPosition.AfterSelectFuncFirstArgument,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          (previousNonWhiteSpace?.is(TokenType.Parenthesis, '(') || currentToken?.is(TokenType.Parenthesis, '()')) &&
            previousKeyword?.value === SELECT
        ),
    },
    {
      id: StatementPosition.FromKeyword,
      name: StatementPosition.FromKeyword,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(previousKeyword?.value === SELECT && previousNonWhiteSpace?.isParenthesis()),
    },
    {
      id: StatementPosition.AfterFromKeyword,
      name: StatementPosition.AfterFromKeyword,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(previousNonWhiteSpace?.value === FROM),
    },
    {
      id: StatementPosition.SchemaFuncFirstArgument,
      name: StatementPosition.SchemaFuncFirstArgument,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          (previousNonWhiteSpace?.is(TokenType.Parenthesis, '(') || currentToken?.is(TokenType.Parenthesis, '()')) &&
            previousKeyword?.value === SCHEMA
        ),
    },
    {
      id: StatementPosition.SchemaFuncExtraArgument,
      name: StatementPosition.SchemaFuncExtraArgument,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(previousKeyword?.value === SCHEMA && previousNonWhiteSpace?.is(TokenType.Delimiter, ',')),
    },
    {
      id: StatementPosition.AfterFrom,
      name: StatementPosition.AfterFrom,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          (previousKeyword?.value === FROM && previousNonWhiteSpace?.isDoubleQuotedString()) ||
            (previousKeyword?.value === FROM && previousNonWhiteSpace?.isVariable()) ||
            (previousKeyword?.value === SCHEMA && previousNonWhiteSpace?.is(TokenType.Parenthesis, ')'))
        ),
    },
    {
      id: StatementPosition.WhereKey,
      name: StatementPosition.WhereKey,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousKeyword?.value === WHERE &&
            (previousNonWhiteSpace?.isKeyword() ||
              previousNonWhiteSpace?.is(TokenType.Parenthesis, '(') ||
              previousNonWhiteSpace?.is(TokenType.Operator, AND))
        ),
    },
    {
      id: StatementPosition.WhereComparisonOperator,
      name: StatementPosition.WhereComparisonOperator,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousKeyword?.value === WHERE &&
            (previousNonWhiteSpace?.isIdentifier() || previousNonWhiteSpace?.isDoubleQuotedString())
        ),
    },
    {
      id: StatementPosition.WhereValue,
      name: StatementPosition.WhereValue,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousKeyword?.value === WHERE &&
            (previousNonWhiteSpace?.is(TokenType.Operator, EQUALS) ||
              previousNonWhiteSpace?.is(TokenType.Operator, NOT_EQUALS))
        ),
    },
    {
      id: StatementPosition.AfterWhereValue,
      name: StatementPosition.AfterWhereValue,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousKeyword?.value === WHERE &&
            (previousNonWhiteSpace?.isString() || previousNonWhiteSpace?.is(TokenType.Parenthesis, ')'))
        ),
    },
    {
      id: StatementPosition.AfterGroupByKeywords,
      name: StatementPosition.AfterGroupByKeywords,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousKeyword?.is(TokenType.Keyword, BY) &&
            previousKeyword?.getPreviousKeyword()?.is(TokenType.Keyword, GROUP) &&
            (previousNonWhiteSpace?.is(TokenType.Keyword, BY) || previousNonWhiteSpace?.is(TokenType.Delimiter, ','))
        ),
    },
    {
      id: StatementPosition.AfterGroupBy,
      name: StatementPosition.AfterGroupBy,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousKeyword?.is(TokenType.Keyword, BY) &&
            previousKeyword?.getPreviousKeyword()?.is(TokenType.Keyword, GROUP) &&
            (previousNonWhiteSpace?.isIdentifier() || previousNonWhiteSpace?.isDoubleQuotedString())
        ),
    },
    {
      id: StatementPosition.AfterOrderByKeywords,
      name: StatementPosition.AfterOrderByKeywords,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousNonWhiteSpace?.is(TokenType.Keyword, BY) &&
            previousNonWhiteSpace?.getPreviousKeyword()?.is(TokenType.Keyword, ORDER)
        ),
    },
    {
      id: StatementPosition.AfterOrderByFunction,
      name: StatementPosition.AfterOrderByFunction,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(
          previousKeyword?.is(TokenType.Keyword, BY) &&
            previousKeyword?.getPreviousKeyword()?.is(TokenType.Keyword, ORDER) &&
            previousNonWhiteSpace?.is(TokenType.Parenthesis) &&
            previousNonWhiteSpace?.getPreviousNonWhiteSpaceToken()?.is(TokenType.Function)
        ),
    },
    {
      id: StatementPosition.AfterOrderByDirection,
      name: StatementPosition.AfterOrderByDirection,
      resolve: (currentToken, previousKeyword, previousNonWhiteSpace, previousIsSlash) =>
        Boolean(previousKeyword?.is(TokenType.Keyword, DESC) || previousKeyword?.is(TokenType.Keyword, ASC)),
    },
  ];
}
