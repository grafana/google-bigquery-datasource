import { toOption } from '@grafana/data';
import { Button, Input, Select } from '@grafana/ui';
import { BigQueryAPI } from 'api';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BasicConfig,
  Builder,
  Config,
  Fields,
  ImmutableTree,
  Query,
  Settings,
  Utils,
  Widgets,
} from 'react-awesome-query-builder';
import useAsync from 'react-use/lib/useAsync';
import { BigQueryQueryNG, QueryWithDefaults } from 'types';
import { toRawSql } from 'utils/sql.utils';
import './SQLBuilderWhereRow.scss';

interface SQLBuilderWhereRowProps {
  query: QueryWithDefaults;
  apiClient: BigQueryAPI;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

const buttonLabels = {
  add: 'Add',
  remove: 'Remove',
};
const emptyInitValue = { id: Utils.uuid(), type: 'group' } as const;
const widgets: Widgets = {
  ...BasicConfig.widgets,
  text: {
    ...BasicConfig.widgets.text,
    factory: function TextInput(props) {
      return (
        <Input
          value={props?.value || ''}
          placeholder={props?.placeholder}
          onChange={(e) => props?.setValue(e.currentTarget.value)}
        />
      );
    },
  },
  number: {
    ...BasicConfig.widgets.number,
    factory: function NumberInput(props) {
      return (
        <Input
          value={props?.value}
          placeholder={props?.placeholder}
          type="number"
          onChange={(e) => props?.setValue(Number.parseInt(e.currentTarget.value, 10))}
        />
      );
    },
  },
};
const settings: Settings = {
  ...BasicConfig.settings,
  canRegroup: false,
  maxNesting: 1,
  canReorder: false,
  showNot: false,
  addRuleLabel: buttonLabels.add,
  deleteLabel: buttonLabels.remove,
  renderConjs: function Conjunctions(conjProps) {
    return (
      <Select
        id={conjProps?.id}
        aria-label="Conjunction"
        menuShouldPortal
        options={conjProps?.conjunctionOptions ? Object.keys(conjProps?.conjunctionOptions).map(toOption) : undefined}
        value={conjProps?.selectedConjunction}
        onChange={(val) => conjProps?.setConjunction(val.value!)}
      />
    );
  },
  renderField: function Field(fieldProps) {
    return (
      <Select
        id={fieldProps?.id}
        width={25}
        aria-label="Field"
        menuShouldPortal
        options={fieldProps?.items.map((f) => ({ label: f.label, value: f.key }))}
        value={fieldProps?.selectedKey}
        onChange={(val) => {
          fieldProps?.setField(val.label!);
        }}
      />
    );
  },
  renderButton: function RAQBButton(buttonProps) {
    return (
      <Button
        type="button"
        title={`${buttonProps?.label} filter`}
        onClick={buttonProps?.onClick}
        variant="secondary"
        size="md"
        icon={buttonProps?.label === buttonLabels.add ? 'plus' : 'times'}
      />
    );
  },
  renderOperator: function Operator(operatorProps) {
    return (
      <Select
        options={operatorProps?.items.map((op) => ({ label: op.label, value: op.key }))}
        aria-label="Operator"
        menuShouldPortal
        value={operatorProps?.selectedKey}
        onChange={(val) => {
          operatorProps?.setField(val.key);
        }}
      />
    );
  },
};

export function SQLBuilderWhereRow({ query, apiClient, onQueryChange }: SQLBuilderWhereRowProps) {
  const [tree, setTree] = useState<ImmutableTree>();
  const state = useAsync(async () => {
    if (!query.location || !query.dataset || !query.table) {
      return;
    }
    const tableSchema = await apiClient.getTableSchema(query.location, query.dataset, query.table);
    const fields: Fields = {};
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
      };
    });

    return fields;
  }, [apiClient, query.dataset, query.location, query.table]);

  useEffect(() => {
    if (state.value && !tree) {
      const initTree = Utils.checkTree(Utils.loadTree(query.sql.whereJsonTree ?? emptyInitValue), {
        ...BasicConfig,
        fields: state.value,
        widgets,
        settings,
      });
      setTree(initTree);
    }
  }, [query.sql.whereJsonTree, state.value, tree]);

  const onTreeChange = useCallback(
    (changedTree: ImmutableTree, config: Config) => {
      setTree(changedTree);
      const newQuery = {
        ...query,
        sql: {
          ...query.sql,
          whereJsonTree: Utils.getTree(changedTree),
          whereString: Utils.sqlFormat(changedTree, config),
        },
      };
      newQuery.rawSql = toRawSql(newQuery, apiClient.getDefaultProject());
      onQueryChange(newQuery);
    },
    [apiClient, onQueryChange, query]
  );

  if (state.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {tree && state.value && (
        <Query
          {...BasicConfig}
          fields={state.value}
          widgets={widgets}
          settings={settings}
          value={tree}
          onChange={onTreeChange}
          renderBuilder={(props) => <Builder {...props} />}
        />
      )}
    </div>
  );
}
