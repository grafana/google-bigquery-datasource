import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import React, { useEffect } from 'react';
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
  applyDefault,
  disabled,
  className,
  onChange,
}) => {
  const state = useAsync(async () => {
    if (dataset === undefined) {
      return [];
    }
    const tables = await apiClient.getTables(projectId, location, dataset);
    console.log(tables);
    return tables.map<SelectableValue<string>>((d) => ({ label: d, value: d }));
  }, [projectId, location, dataset]);

  useEffect(() => {
    // Set default dataset when values are fetched
    if (!value) {
      if (state.value && state.value[0]) {
        onChange(state.value[0]);
      }
    } else {
      if (state.value && state.value.find((v) => v.value === value) === undefined) {
        // if value is set and newly fetched values does not contain selected value
        if (state.value.length > 0) {
          onChange(state.value[0]);
        }
      }
    }
  }, [state.value, value, location, applyDefault, onChange]);

  return (
    <Select
      className={className}
      value={value}
      options={state.value}
      onChange={onChange}
      disabled={!Boolean(dataset)}
      isLoading={state.loading}
    />
  );
};
