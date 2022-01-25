import { toOption } from '@grafana/data';
import { InlineSelect } from '@grafana/experimental';
import { Button } from '@grafana/ui';
import { BigQueryAPI } from 'api';
import React, { useEffect, useState } from 'react';
import { BasicConfig, Builder, Fields, ImmutableTree, Query, Utils } from 'react-awesome-query-builder';
import useAsync from 'react-use/lib/useAsync';
import { BigQueryQueryNG, QueryWithDefaults } from 'types';
import { toRawSql } from 'utils/sql.utils';

interface SQLBuilderWhereRowProps {
  query: QueryWithDefaults;
  apiClient: BigQueryAPI;
  onQueryChange: (query: BigQueryQueryNG) => void;
}

const emptyInitValue = { id: Utils.uuid(), type: 'group' } as const;

export function SQLBuilderWhereRow({ query, apiClient, onQueryChange }: SQLBuilderWhereRowProps) {
  const [tree, setTree] = useState<ImmutableTree>();
  const state = useAsync(async () => {
    if (!query.location || !query.dataset || !query.table) {
      return;
    }
    const columns = await apiClient.getColumns(query.location, query.dataset, query.table);
    const fields: Fields = {};
    for (const col of columns) {
      fields[col] = {
        type: 'text',
        valueSources: ['value'],
      };
    }
    return fields;
  }, [apiClient, query.dataset, query.location, query.table]);

  useEffect(() => {
    if (state.value && !tree) {
      const initTree = Utils.checkTree(Utils.loadTree(query.sql.whereJsonTree ?? emptyInitValue), {
        ...BasicConfig,
        fields: state.value,
      });
      setTree(initTree);
    }
  }, [query.sql.whereJsonTree, state.value, tree]);

  if (state.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {tree && state.value && (
        <Query
          {...BasicConfig}
          fields={state.value}
          settings={{
            ...BasicConfig.settings,
            canRegroup: false,
            maxNesting: 1,
            canReorder: false,
            showNot: false,
            addRuleLabel: 'plus',
            deleteLabel: 'times',
            // eslint-disable-next-line react/display-name
            renderConjs: (conjProps) => (
              <InlineSelect
                id={conjProps?.id}
                options={
                  conjProps?.conjunctionOptions ? Object.keys(conjProps?.conjunctionOptions).map(toOption) : undefined
                }
                value={conjProps?.selectedConjunction}
                onChange={(val) => conjProps?.setConjunction(val.value!)}
              />
            ),
            // eslint-disable-next-line react/display-name
            renderField: (fieldProps) => (
              <InlineSelect
                id={fieldProps?.id}
                options={fieldProps?.items}
                onChange={(val) => {
                  fieldProps?.setField(val.label!);
                }}
              />
            ),
            // eslint-disable-next-line react/display-name
            renderButton: (buttonProps) => (
              <Button onClick={buttonProps?.onClick} variant="secondary" size="md" icon={buttonProps?.label as any} />
            ),
            // eslint-disable-next-line react/display-name
            renderOperator: (operatorProps) => (
              <InlineSelect
                options={operatorProps?.items}
                onChange={(val) => {
                  operatorProps?.setField(val.label!);
                }}
              />
            ),
          }}
          value={tree}
          onChange={(changedTree, config) => {
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
          }}
          renderBuilder={(props) => <Builder {...props} />}
        />
      )}
    </div>
  );
}
