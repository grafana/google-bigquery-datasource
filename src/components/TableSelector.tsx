import { BigQueryAPI } from '../api';

import { SelectableValue } from '@grafana/data';
import { Field, Select } from '@grafana/ui';

import React, { useEffect } from 'react';

import { useAsync } from 'react-use';

interface DatasetSelectorProps {
  apiClient: BigQueryAPI;
  location: string;
  projectId: string;
  dataset?: string;
  value?: string;
  onChange: (v: SelectableValue) => void;
  applyDefault?: boolean;
  disabled?: boolean;
}

export const TableSelector: React.FC<DatasetSelectorProps> = ({
  apiClient,
  location,
  projectId,
  value,
  dataset,
  applyDefault,
  disabled,
  onChange,
}) => {
  const state = useAsync(async () => {
    if (dataset === undefined) {
      return null;
    }
    const datasets = await apiClient.getTables(projectId, location, dataset);
    return datasets.map<SelectableValue<string>>((d) => ({ label: d, value: d }));
  }, [projectId, location, dataset]);

  useEffect(() => {
    if (!applyDefault) {
      return;
    }
    // Set default dataset when values are fetched
    if (!value) {
      if (state.value && state.value[0]) {
        onChange(state.value[0]);
      }
    } else {
      if (state.value && state.value.find((v) => v.value === value) === undefined) {
        onChange(state.value[0]);
      }
    }
  }, [state.value, value, location, applyDefault, onChange]);

  if (state.loading && value === undefined) return null;

  return <Select className="width-30" value={value} options={state.value} onChange={onChange} disabled={disabled} />;
};
