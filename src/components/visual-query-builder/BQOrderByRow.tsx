import React from 'react';

import { type SelectableValue } from '@grafana/data';

import { SQLOrderByRow } from '@/components/visual-query-builder/SQLOrderByRow';
import { type BigQueryQueryNG, type QueryWithDefaults } from '@/types';
import { useColumns } from '@/utils/useColumns';
import { useSqlChange } from '@/utils/useSqlChange';

type BQOrderByRowProps = {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
};

export function BQOrderByRow({ query, onQueryChange }: BQOrderByRowProps) {
  const columns = useColumns({ query, isOrderable: true });
  const { onSqlChange } = useSqlChange({ query, onQueryChange });
  let columnsWithIndices: SelectableValue[] = [];

  if (columns.value) {
    columnsWithIndices = [
      {
        value: '',
        label: 'Selected columns',
        options: query.sql.columns?.map((c: any, i: any) => ({
          value: i + 1,
          label: c.name
            ? `${i + 1} - ${c.name}(${c.parameters?.map((p: any) => `${p.name}`)})`
            : c.parameters?.map((p: any) => `${i + 1} - ${p.name}`),
        })),
        expanded: true,
      },
      ...columns.value,
    ];
  }

  return <SQLOrderByRow sql={query.sql} onSqlChange={onSqlChange} columns={columnsWithIndices} />;
}
