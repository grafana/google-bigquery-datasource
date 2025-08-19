import { SelectableValue } from '@grafana/data';
import { Combobox } from '@grafana/ui';
import React from 'react';
import { useAsync } from 'react-use';
import { toOption } from 'utils/data';
import { QueryWithDefaults, ResourceSelectorProps } from '../types';

interface TableSelectorProps extends ResourceSelectorProps {
  value: string | null;
  query: QueryWithDefaults;
  onChange: (v: SelectableValue) => void;
  inputId?: string;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  apiClient,
  query,
  value,
  onChange,
  inputId,
}) => {
  const state = useAsync(async () => {
    if (!query.dataset) {
      return [];
    }
    const tables = await apiClient.getTables(query);
    return tables.map(toOption);
  }, [query]);

  return (
    <Combobox
      disabled={state.loading}
      id={inputId}
      aria-label="Table selector"
      value={value}
      options={state.value ?? []}
      onChange={onChange}
      loading={state.loading}
      placeholder={state.loading ? 'Loading tables' : 'Select table'}
    />
  );
};
