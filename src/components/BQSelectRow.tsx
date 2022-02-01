import React from 'react';
import { BigQueryQueryNG, QueryWithDefaults } from '../types';
import { useColumns } from '../utils/useColumns';
import { useSqlChange } from '../utils/useSqlChange';
import { SQLSelectRow } from './visual-query-builder/SQLSelectRow';

interface BQSelectRowProps {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

export function BQSelectRow({ query, onQueryChange }: BQSelectRowProps) {
  const columns = useColumns({ query });
  const { onSqlChange } = useSqlChange({ query, onQueryChange });

  return <SQLSelectRow columns={columns.value} sql={query.sql} onSqlChange={onSqlChange} />;
}
