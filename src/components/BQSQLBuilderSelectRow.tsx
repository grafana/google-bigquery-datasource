import React from 'react';
import { BigQueryQueryNG, QueryWithDefaults } from '../types';
import { useColumns } from '../utils/useColumns';
import { useSqlChange } from '../utils/useSqlChange';
import { SQLSelectRow } from './visual-query-builder/SQLSelectRow';

interface SQLBuilderSelectRowProps {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

export function SQLBuilderSelectRow({ query, onQueryChange }: SQLBuilderSelectRowProps) {
  const columns = useColumns({ query });
  const { onSqlChange } = useSqlChange({ query, onQueryChange });

  return <SQLSelectRow columns={columns.value} sql={query.sql} onSqlChange={onSqlChange} />;
}
