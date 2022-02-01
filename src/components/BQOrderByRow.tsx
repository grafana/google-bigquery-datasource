import React from 'react';
import { BigQueryQueryNG, QueryWithDefaults } from 'types';
import { useColumns } from '../utils/useColumns';
import { useSqlChange } from '../utils/useSqlChange';
import { SQLOrderByRow } from './visual-query-builder/SQLOrderByRow';

type BQOrderByRowProps = {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
};

export function BQOrderByRow({ query, onQueryChange }: BQOrderByRowProps) {
  const columns = useColumns({ query, isOrderable: true });
  const { onSqlChange } = useSqlChange({ query, onQueryChange });

  return <SQLOrderByRow sql={query.sql} onSqlChange={onSqlChange} columns={columns.value} />;
}
