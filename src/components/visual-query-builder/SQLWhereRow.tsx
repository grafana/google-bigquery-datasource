import { injectGlobal } from '@emotion/css';
import { Builder, Config, ImmutableTree, Query, Utils } from '@react-awesome-query-builder/ui';
import React, { useCallback, useMemo, useState } from 'react';
import { SQLExpression } from '../../types';
import { emptyInitValue, raqbConfig } from './AwesomeQueryBuilder';

interface SQLBuilderWhereRowProps {
  sql: SQLExpression;
  onSqlChange: (sql: SQLExpression) => void;
  config?: Partial<Config>;
}

export function SQLWhereRow({ sql, config, onSqlChange }: SQLBuilderWhereRowProps) {
  const configWithDefaults = useMemo(() => ({ ...raqbConfig, ...config }), [config]);

  // Lazy initialization - only runs once on mount
  const [tree, setTree] = useState<ImmutableTree>(() =>
    Utils.Validation.sanitizeTree(
      Utils.loadTree(sql.whereJsonTree ?? emptyInitValue),
      { ...raqbConfig, ...config }
    ).fixedTree
  );

  // Track previous value to detect prop changes
  const [prevWhereJsonTree, setPrevWhereJsonTree] = useState(sql.whereJsonTree);

  // Adjust the state during rendering when whereJsonTree becomes falsy
  if (sql.whereJsonTree !== prevWhereJsonTree) {
    setPrevWhereJsonTree(sql.whereJsonTree);
    if (!sql.whereJsonTree) {
      setTree(Utils.Validation.sanitizeTree(Utils.loadTree(emptyInitValue), configWithDefaults).fixedTree);
    }
  }

  const onTreeChange = useCallback(
    (changedTree: ImmutableTree, config: Config) => {
      setTree(changedTree);
      const newSql = {
        ...sql,
        whereJsonTree: Utils.getTree(changedTree),
        whereString: Utils.sqlFormat(changedTree, config),
      };

      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  return (
    <Query
      {...configWithDefaults}
      value={tree}
      onChange={onTreeChange}
      renderBuilder={(props) => <Builder {...props} />}
    />
  );
}

function flex(direction: string) {
  return `
    display: flex;
    gap: 8px;
    flex-direction: ${direction};`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
injectGlobal`
  .group--header {
    ${flex('row')}
  }

  .group-or-rule {
    ${flex('column')}
    .rule {
      flex-direction: row;
    }
  }

  .rule--body {
    ${flex('row')}
  }

  .group--children {
    ${flex('column')}
  }

  .group--conjunctions:empty {
    display: none;
  }
`;
