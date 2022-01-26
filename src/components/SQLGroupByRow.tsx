import { SelectableValue, toOption } from '@grafana/data';
import { AccessoryButton, EditorList, InputGroup } from '@grafana/experimental';
import { Select } from '@grafana/ui';
import { BigQueryAPI } from 'api';
import { QueryEditorGroupByExpression } from 'expressions';
import React from 'react';
import { setGroupByField, toRawSql } from 'utils/sql.utils';
import { useColumns } from 'utils/useColumns';
import { BigQueryQueryNG, QueryWithDefaults } from '../types';

interface SQLGroupByRowProps {
  query: QueryWithDefaults;
  apiClient: BigQueryAPI;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

export function SQLGroupByRow({ query, apiClient, onQueryChange }: SQLGroupByRowProps) {
  const state = useColumns({ apiClient, query, isOrderable: true });

  return (
    <EditorList<QueryEditorGroupByExpression>
      items={query.sql.groupBy!}
      onChange={(item) => {
        // As new (empty object) items come in, we need to make sure they have the correct type
        const cleaned = item.map((v) => setGroupByField(v.property?.name));
        const newQuery = { ...query, sql: { ...query.sql, groupBy: cleaned } };
        newQuery.rawSql = toRawSql(newQuery, apiClient.getDefaultProject());
        onQueryChange(newQuery);
      }}
      renderItem={makeRenderColumn({
        options: state.value,
        isLoading: state.loading,
        disabled: !query.table || !query.dataset || !query.location,
      })}
    />
  );
}

function makeRenderColumn({
  options,
  disabled,
  isLoading,
}: {
  options?: Array<SelectableValue<string>>;
  disabled: boolean;
  isLoading: boolean;
}) {
  const renderColumn = function (
    item: Partial<QueryEditorGroupByExpression>,
    onChangeItem: (item: QueryEditorGroupByExpression) => void,
    onDeleteItem: () => void
  ) {
    return (
      <InputGroup>
        <Select
          value={item.property?.name ? toOption(item.property.name) : null}
          options={options}
          menuShouldPortal
          onChange={({ value }) => value && onChangeItem(setGroupByField(value))}
          disabled={disabled}
          isLoading={isLoading}
        />
        <AccessoryButton aria-label="remove" icon="times" variant="secondary" onClick={onDeleteItem} />
      </InputGroup>
    );
  };
  return renderColumn;
}
