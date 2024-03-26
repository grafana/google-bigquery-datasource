import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import React from 'react';
import { useAsync } from 'react-use';
import { toOption } from 'utils/data';
import { QueryWithDefaults, ResourceSelectorProps } from '../types';

interface TableSelectorProps extends ResourceSelectorProps {
  value: string | null;
  query: QueryWithDefaults;
  onChange: (v: SelectableValue) => void;
}

export const TableSelector: React.FC<TableSelectorProps> = ({ apiClient, query, value, className, onChange }) => {
  const state = useAsync(async () => {
    if (!query.dataset) {
      return [];
    }
    const tables = await apiClient.getTables(query);
    return tables.map((table) => ({ label: table, value: table })); // Adjust label and value properties based on table structure
  }, [query]);

  return (
    <Select
      className={className}
      disabled={state.loading}
      aria-label="Table selector"
      value={value}
      allowCustomValue
      options={state.value || [{ label: value, value }]}
      onChange={onChange}
      isLoading={state.loading}
      menuShouldPortal={true}
      placeholder={state.loading ? 'Loading tables' : 'Select table'}
    />
  );
};
