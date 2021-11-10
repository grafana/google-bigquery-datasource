import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import React from 'react';
import { useAsync } from 'react-use';
import { ResourceSelectorProps } from '../types';

interface TableSelectorProps extends ResourceSelectorProps {
  dataset?: string;
  value?: string;
  onChange: (v: SelectableValue) => void;
  disabled?: boolean;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  apiClient,
  location,
  projectId,
  value,
  dataset,
  className,
  onChange,
}) => {
  const state = useAsync(async () => {
    if (!projectId || !dataset) {
      return [];
    }
    const tables = await apiClient.getTables(projectId, location, dataset);
    return tables.map<SelectableValue<string>>((d) => ({ label: d, value: d }));
  }, [projectId, location, dataset]);

  return (
    <Select
      className={className}
      value={value}
      options={state.value}
      onChange={onChange}
      disabled={!Boolean(projectId) || !Boolean(dataset) || state.loading}
      isLoading={state.loading}
    />
  );
};
