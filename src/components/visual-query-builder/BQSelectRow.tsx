import React from 'react';

import { SQLSelectRow } from '@/components/visual-query-builder/SQLSelectRow';
import { BigQueryQueryNG, QueryWithDefaults } from '@/types';
import { useColumns } from '@/utils/useColumns';
import { useSqlChange } from '@/utils/useSqlChange';

interface BQSelectRowProps {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

export function BQSelectRow({ query, onQueryChange }: BQSelectRowProps) {
  const columns = useColumns({ query });
  const { onSqlChange } = useSqlChange({ query, onQueryChange });

  return <SQLSelectRow columns={columns.value} sql={query.sql} onSqlChange={onSqlChange} />;
}
