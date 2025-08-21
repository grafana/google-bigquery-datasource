import React, { useCallback } from 'react';

import { SelectableValue } from '@grafana/data';
import { AccessoryButton, EditorList, InputGroup } from '@grafana/plugin-ui';
import { Select } from '@grafana/ui';
import { QueryEditorExpressionType, QueryEditorGroupByExpression } from 'expressions';
import { SQLExpression } from 'types';
import { toOption } from 'utils/data';
import { setGroupByField } from 'utils/sql.utils';

interface SQLGroupByRowProps {
  sql: SQLExpression;
  onSqlChange: (sql: SQLExpression) => void;
  columns?: Array<SelectableValue<string>>;
}

export function SQLGroupByRow({ sql, columns, onSqlChange }: SQLGroupByRowProps) {
  const onGroupByChange = useCallback(
    (items: unknown[]) => {
      // As new (empty object) items come in, we need to make sure they have the correct type
      const cleaned = items.map((v) => {
        // Narrow the type for item to QueryEditorGroupByExpression
        if (isQueryEditorGroupByExpression(v)) {
          return setGroupByField(v.property?.name);
        }
        return setGroupByField();
      });
      const newSql = { ...sql, groupBy: cleaned };
      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  return (
    <EditorList
      items={sql.groupBy!}
      onChange={onGroupByChange}
      renderItem={makeRenderColumn({
        options: columns,
      })}
    />
  );
}

function makeRenderColumn({ options }: { options?: Array<SelectableValue<string>> }) {
  const renderColumn = function (
    item: Partial<unknown>,
    onChangeItem: (item: Partial<unknown>) => void,
    onDeleteItem: () => void
  ) {
    return (
      <InputGroup>
        {/* TODO: migrate this to ComboBox when we find a way to use ComboBox with icons. Disabling lint warning for now */}
        {/* eslint-disable-next-line deprecation/deprecation */}
        <Select
          value={isQueryEditorGroupByExpression(item) && item.property?.name ? toOption(item.property.name) : null}
          aria-label="Group by"
          options={options}
          menuShouldPortal
          onChange={({ value }) => value && onChangeItem(setGroupByField(value))}
        />
        <AccessoryButton aria-label="Remove group by column" icon="times" variant="secondary" onClick={onDeleteItem} />
      </InputGroup>
    );
  };
  return renderColumn;
}

// Type guard for QueryEditorGroupByExpression
function isQueryEditorGroupByExpression(item: unknown): item is QueryEditorGroupByExpression {
  return typeof item === 'object' && item != null && 'type' in item && item.type === QueryEditorExpressionType.GroupBy;
}
