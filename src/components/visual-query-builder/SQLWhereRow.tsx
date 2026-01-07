import React, { useCallback, useMemo, useState } from 'react';

import { injectGlobal } from '@emotion/css';
import { Builder, type Config, type ImmutableTree, Query, Utils } from '@react-awesome-query-builder/ui';

import type { SQLExpression } from '../../types';

import { emptyInitValue, raqbConfig } from './AwesomeQueryBuilder';

interface SQLBuilderWhereRowProps {
  sql: SQLExpression;
  onSqlChange: (sql: SQLExpression) => void;
  config?: Partial<Config>;
}

export function SQLWhereRow({ sql, config, onSqlChange }: SQLBuilderWhereRowProps) {
  const configWithDefaults = useMemo(() => ({ ...raqbConfig, ...config }), [config]);

  // Lazy initialization - only runs once on mount
  const [tree, setTree] = useState<ImmutableTree>(() => {
    const updatedConfig = { ...raqbConfig, ...config };
    const tree = Utils.loadTree(sql.whereJsonTree ?? emptyInitValue);
    return Utils.Validation.sanitizeTree(tree, updatedConfig).fixedTree;
  });

  // Track previous value to detect prop changes
  const [prevWhereJsonTree, setPrevWhereJsonTree] = useState(sql.whereJsonTree);
  const [prevConfig, setPrevConfig] = useState(config);

  // Update the tree when whereJsonTree becomes falsy OR when config changes (fields loaded)
  if (sql.whereJsonTree !== prevWhereJsonTree || config !== prevConfig) {
    setPrevWhereJsonTree(sql.whereJsonTree);
    setPrevConfig(config);
    if (!sql.whereJsonTree) {
      setTree(Utils.Validation.sanitizeTree(Utils.loadTree(emptyInitValue), configWithDefaults).fixedTree);
    } else if (config !== prevConfig && sql.whereJsonTree) {
      const reloadedTree = Utils.loadTree(sql.whereJsonTree);
      setTree(Utils.Validation.sanitizeTree(reloadedTree, configWithDefaults).fixedTree);
    }
  }

  const onTreeChange = useCallback(
    (changedTree: ImmutableTree, config: Config) => {
      setTree(changedTree);
      const whereString = Utils.sqlFormat(changedTree, config);
      const whereJsonTree = whereString ? Utils.getTree(changedTree) : undefined;
      const newSql = { ...sql, whereJsonTree, whereString };
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
