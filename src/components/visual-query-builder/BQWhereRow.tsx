import { BigQueryAPI, TableSchema } from 'api';
import React, { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { BigQueryQueryNG, QueryWithDefaults } from 'types';
import { mapColumnTypeToIcon } from 'utils/useColumns';
import { useSqlChange } from 'utils/useSqlChange';
import { Config } from './AwesomeQueryBuilder';
import { SQLWhereRow } from './SQLWhereRow';

interface BQWhereRowProps {
  query: QueryWithDefaults;
  apiClient: BigQueryAPI;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

export function BQWhereRow({ query, apiClient, onQueryChange }: BQWhereRowProps) {
  const state = useAsync(async () => {
    if (!query.dataset || !query.table) {
      return;
    }
    const tableSchema = await apiClient.getTableSchema(query);
    return getFields(tableSchema);
  }, [apiClient, query.dataset, query.location, query.table]);

  const { onSqlChange } = useSqlChange({ query, onQueryChange });
  const config = useMemo(() => ({ fields: state.value || {} }), [state.value]);

  return (
    <SQLWhereRow
      // Reset component state when dataset/table changes to ensure operators render correctly
      key={`${query.dataset}-${query.location}-${query.table}`}
      config={config}
      sql={query.sql}
      onSqlChange={onSqlChange}
    />
  );
}

function getFields(tableSchema: TableSchema) {
  const fields: Config['fields'] = {};
  tableSchema.schema?.forEach((field) => {
    let type = 'text';
    switch (field.type) {
      case 'BOOLEAN':
      case 'BOOL': {
        type = 'boolean';
        break;
      }
      case 'BYTES': {
        type = 'text';
        break;
      }
      case 'FLOAT':
      case 'FLOAT64':
      case 'INTEGER':
      case 'INT64':
      case 'NUMERIC':
      case 'BIGNUMERIC': {
        type = 'number';
        break;
      }
      case 'DATE': {
        type = 'date';
        break;
      }
      case 'DATETIME': {
        type = 'datetime';
        break;
      }
      case 'TIME': {
        type = 'time';
        break;
      }
      case 'TIMESTAMP': {
        type = 'datetime';
        break;
      }
      case 'GEOGRAPHY': {
        type = 'text';
        break;
      }
      default:
        break;
    }
    fields[field.name] = {
      type,
      valueSources: ['value'],
      mainWidgetProps: { customProps: { icon: mapColumnTypeToIcon(field.type) } },
    };
  });
  return fields;
}
