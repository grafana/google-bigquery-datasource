import React, { useCallback } from 'react';

import { SelectableValue } from '@grafana/data';
import { EditorField, InputGroup, Space } from '@grafana/plugin-ui';
import { Input, RadioButtonGroup, Select } from '@grafana/ui';
import { uniqueId } from 'lodash';
import { SQLExpression } from 'types';
import { toOption } from 'utils/data';
import { setPropertyField } from 'utils/sql.utils';

type SQLOrderByRowProps = {
  sql: SQLExpression;
  onSqlChange: (sql: SQLExpression) => void;
  columns?: Array<SelectableValue<string>>;
  showOffset?: boolean;
};

const sortOrderOptions = [
  { description: 'Sort by ascending', value: 'ASC', icon: 'sort-amount-up' } as const,
  { description: 'Sort by descending', value: 'DESC', icon: 'sort-amount-down' } as const,
];

export function SQLOrderByRow({ sql, onSqlChange, columns, showOffset }: SQLOrderByRowProps) {
  const onSortOrderChange = useCallback(
    (item: 'ASC' | 'DESC') => {
      const newSql: SQLExpression = { ...sql, orderByDirection: item };
      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  const onLimitChange = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      const newSql: SQLExpression = { ...sql, limit: Number.parseInt(event.currentTarget.value, 10) };
      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  const onOffsetChange = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      const newSql: SQLExpression = { ...sql, offset: Number.parseInt(event.currentTarget.value, 10) };
      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  const onOrderByChange = useCallback(
    (item: SelectableValue<string>) => {
      const newSql: SQLExpression = { ...sql, orderBy: setPropertyField(item?.value) };
      if (item === null) {
        newSql.orderByDirection = undefined;
      }
      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  return (
    <>
      <EditorField label="Order by" width={25}>
        <InputGroup>
          {/* TODO: migrate this to ComboBox when we find a way to use ComboBox options with icons. Disabling lint warning for now */}
          {/* eslint-disable-next-line @typescript-eslint/no-deprecated */}
          <Select
            aria-label="Order by"
            options={columns}
            value={sql.orderBy?.property.name ? toOption(sql.orderBy.property.name) : null}
            isClearable
            menuShouldPortal
            onChange={onOrderByChange}
          />

          <Space h={1.5} />

          <RadioButtonGroup
            options={sortOrderOptions}
            disabled={!sql?.orderBy?.property.name}
            value={sql.orderByDirection}
            onChange={onSortOrderChange}
          />
        </InputGroup>
      </EditorField>
      <EditorField label="Limit" optional width={25}>
        <Input type="number" min={0} id={uniqueId('limit-')} value={sql.limit || ''} onChange={onLimitChange} />
      </EditorField>
      {showOffset && (
        <EditorField label="Offset" optional width={25}>
          <Input type="number" id={uniqueId('offset-')} value={sql.offset || ''} onChange={onOffsetChange} />
        </EditorField>
      )}
    </>
  );
}
