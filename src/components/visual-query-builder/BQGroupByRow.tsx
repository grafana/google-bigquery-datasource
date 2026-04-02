import React from 'react';

import { SQLGroupByRow } from '@/components/visual-query-builder/SQLGroupByRow';
import type { BigQueryQueryNG, QueryWithDefaults } from '@/types';
import { useColumns } from '@/utils/useColumns';
import { useSqlChange } from '@/utils/useSqlChange';

interface BQGroupByRowProps {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

export function BQGroupByRow({ query, onQueryChange }: BQGroupByRowProps) {
  const columns = useColumns({ query, isOrderable: true });
  const { onSqlChange } = useSqlChange({ query, onQueryChange });

  return <SQLGroupByRow columns={columns.value} sql={query.sql} onSqlChange={onSqlChange} />;
}
