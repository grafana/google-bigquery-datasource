import React, { useCallback } from 'react';

import { css } from '@emotion/css';
import { SelectableValue } from '@grafana/data';
import { EditorField } from '@grafana/plugin-ui';
import { Button, Combobox, ComboboxOption, Select, Stack, useStyles2 } from '@grafana/ui';
import { QueryEditorExpressionType, QueryEditorFunctionExpression } from 'expressions';
import { uniqueId } from 'lodash';
import { toOption } from 'utils/data';
import { createFunctionField } from 'utils/sql.utils';

import { SQLExpression } from '../../types';
import { BQ_AGGREGATE_FNS } from '../query-editor-raw/bigQueryFunctions';

interface SQLSelectRowProps {
  sql: SQLExpression;
  onSqlChange: (sql: SQLExpression) => void;
  columns?: Array<SelectableValue<string>>;
}

const asteriskValue = { label: '*', value: '*' };

export function SQLSelectRow({ sql, columns, onSqlChange }: SQLSelectRowProps) {
  const styles = useStyles2(getStyles);
  const columnsWithAsterisk = [asteriskValue, ...(columns || [])];

  const onColumnChange = useCallback(
    (item: QueryEditorFunctionExpression, index: number) => (column: SelectableValue<string>) => {
      let modifiedItem = { ...item };
      if (!item.parameters?.length) {
        modifiedItem.parameters = [{ type: QueryEditorExpressionType.FunctionParameter, name: column.value } as const];
      } else {
        modifiedItem.parameters = item.parameters.map((p) =>
          p.type === QueryEditorExpressionType.FunctionParameter ? { ...p, name: column.value } : p
        );
      }

      const newSql: SQLExpression = {
        ...sql,
        columns: sql.columns?.map((c, i) => (i === index ? modifiedItem : c)),
      };

      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  const onAggregationChange = useCallback(
    (item: QueryEditorFunctionExpression, index: number) => (aggregation: ComboboxOption<string> | null) => {
      const newItem = {
        ...item,
        name: aggregation?.value,
      };
      const newSql: SQLExpression = {
        ...sql,
        columns: sql.columns?.map((c, i) => (i === index ? newItem : c)),
      };

      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  const removeColumn = useCallback(
    (index: number) => () => {
      const clone = [...sql.columns!];
      clone.splice(index, 1);
      const newSql: SQLExpression = {
        ...sql,
        columns: clone,
      };
      onSqlChange(newSql);
    },
    [onSqlChange, sql]
  );

  const addColumn = useCallback(() => {
    const newSql: SQLExpression = { ...sql, columns: [...sql.columns!, createFunctionField()] };
    onSqlChange(newSql);
  }, [onSqlChange, sql]);

  return (
    <Stack gap={2} alignItems="end" wrap="wrap" direction="column">
      {sql.columns?.map((item, index) => (
        <div key={index}>
          <Stack gap={2} alignItems="end">
            <EditorField label="Column" width={25}>
              {/* TODO: migrate this to ComboBox when we find a way to use ComboBox options with icons. Disabling lint warning for now */}
              {/* eslint-disable-next-line @typescript-eslint/no-deprecated */}
              <Select
                value={getColumnValue(item)}
                options={columnsWithAsterisk}
                inputId={`select-column-${index}-${uniqueId()}`}
                menuShouldPortal
                allowCustomValue
                onChange={onColumnChange(item, index)}
              />
            </EditorField>

            <EditorField label="Aggregation" optional width={25}>
              <Combobox
                value={item.name ? toOption(item.name) : null}
                id={`select-aggregation-${index}-${uniqueId()}`}
                isClearable
                createCustomValue
                options={aggregateFnOptions}
                onChange={onAggregationChange(item, index)}
              />
            </EditorField>
            <Button
              aria-label="Remove"
              type="button"
              icon="trash-alt"
              variant="secondary"
              size="md"
              onClick={removeColumn(index)}
            />
          </Stack>
        </div>
      ))}
      <Button
        type="button"
        onClick={addColumn}
        variant="secondary"
        size="md"
        icon="plus"
        aria-label="Add"
        className={styles.addButton}
      />
    </Stack>
  );
}

const getStyles = () => {
  return { addButton: css({ alignSelf: 'flex-start' }) };
};

const aggregateFnOptions = BQ_AGGREGATE_FNS.map((v) => toOption(v.name));

function getColumnValue({ parameters }: QueryEditorFunctionExpression): ComboboxOption<string> | null {
  const column = parameters?.find((p) => p.type === QueryEditorExpressionType.FunctionParameter);
  if (column?.name) {
    return toOption(column.name);
  }
  return null;
}
