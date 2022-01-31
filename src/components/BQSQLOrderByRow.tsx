import React from 'react';
import { BigQueryQueryNG, QueryWithDefaults } from 'types';
import { useColumns } from '../utils/useColumns';
import { useSqlChange } from '../utils/useSqlChange';
import { SQLOrderByRow } from './visual-query-builder/SQLOrderByRow';

type SQLOrderByRowProps = {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
};

export function BQSQLOrderByRow({ query, onQueryChange }: SQLOrderByRowProps) {
  const columns = useColumns({ query, isOrderable: true });
  const { onSqlChange } = useSqlChange({ query, onQueryChange });

  return <SQLOrderByRow sql={query.sql} onSqlChange={onSqlChange} columns={columns.value} />;
}
