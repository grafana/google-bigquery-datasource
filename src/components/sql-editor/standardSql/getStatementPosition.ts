import { StatementPosition, TokenType } from '../utils/types';
import { LinkedToken } from '../utils/LinkedToken';
import { statementPositionResolversRegistry } from './registries';

// Given current cursor position in the SQL editor, returns the statement position.
export function getStatementPosition(currentToken: LinkedToken | null): StatementPosition {
  const previousNonWhiteSpace = currentToken?.getPreviousNonWhiteSpaceToken();
  const previousKeyword = currentToken?.getPreviousKeyword();
  const previousIsSlash = currentToken?.getPreviousNonWhiteSpaceToken()?.is(TokenType.Operator, '/');

  const resolvers = statementPositionResolversRegistry.list();

  for (const resolver of resolvers) {
    if (
      resolver.resolve(currentToken, previousKeyword ?? null, previousNonWhiteSpace ?? null, Boolean(previousIsSlash))
    ) {
      return resolver.id;
    }
  }

  return StatementPosition.Unknown;
}
