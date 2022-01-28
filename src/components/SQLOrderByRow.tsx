import { toOption } from '@grafana/data';
import { EditorField, Space } from '@grafana/experimental';
import { Input, RadioButtonGroup, Select } from '@grafana/ui';
import { BigQueryAPI } from 'api';
import React from 'react';
import { BigQueryQueryNG, QueryWithDefaults } from 'types';
import { setPropertyField, toRawSql } from 'utils/sql.utils';
import { useColumns } from 'utils/useColumns';

type SQLOrderByRowProps = {
  query: QueryWithDefaults;
  onQueryChange: (query: BigQueryQueryNG) => void;
  apiClient: BigQueryAPI;
};

const sortOrderOptions = [
  { description: 'Sort by ascending', value: 'ASC', icon: 'sort-amount-up' } as const,
  { description: 'Sort by descending', value: 'DESC', icon: 'sort-amount-down' } as const,
];

export function SQLOrderByRow({ query, onQueryChange, apiClient }: SQLOrderByRowProps) {
  const state = useColumns({ apiClient, query, isOrderable: true });

  const onSortOrderChange = (item: 'ASC' | 'DESC') => {
    const newQuery = { ...query, sql: { ...query.sql, orderByDirection: item } };
    newQuery.rawSql = toRawSql(newQuery, apiClient.getDefaultProject());
    onQueryChange(newQuery);
  };

  return (
    <>
      <EditorField label="Order by" width={25}>
        <>
          <Select
            aria-label="Order by"
            options={state.value}
            value={query.sql?.orderBy?.property.name ? toOption(query.sql.orderBy.property.name) : null}
            isClearable
            menuShouldPortal
            onChange={(e) => {
              const newQuery = { ...query, sql: { ...query.sql, orderBy: setPropertyField(e?.value) } };
              if (e === null) {
                newQuery.sql.orderByDirection = undefined;
              }
              newQuery.rawSql = toRawSql(newQuery, apiClient.getDefaultProject());
              onQueryChange(newQuery);
            }}
          />

          <Space h={1.5} />

          <RadioButtonGroup
            options={sortOrderOptions}
            disabled={!query.sql?.orderBy?.property.name}
            value={query.sql.orderByDirection}
            onChange={onSortOrderChange}
          />
        </>
      </EditorField>
      <EditorField label="Limit" optional width={25}>
        <Input
          type="number"
          id={`limit-${query.refId}`}
          value={query.sql.limit || ''}
          onChange={(e) => {
            const newQuery = { ...query, sql: { ...query.sql, limit: Number.parseInt(e.currentTarget.value, 10) } };
            newQuery.rawSql = toRawSql(newQuery, apiClient.getDefaultProject());
            onQueryChange(newQuery);
          }}
        />
      </EditorField>
    </>
  );
}
