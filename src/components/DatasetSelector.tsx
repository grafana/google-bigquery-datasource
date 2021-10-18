import { BigQueryAPI } from '../api';

import { SelectableValue } from '@grafana/data';
import { Field, Select } from '@grafana/ui';

import React, { useEffect } from 'react';

import { useAsync } from 'react-use';

interface DatasetSelectorProps {
  apiClient: BigQueryAPI;
  location: string;
  projectId: string;
  value?: string;
  applyDefault?: boolean;
  disabled?: boolean;
  onChange: (v: SelectableValue) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  apiClient,
  location,
  projectId,
  value,
  onChange,
  disabled,
  applyDefault,
}) => {
  const state = useAsync(async () => {
    const datasets = await apiClient.getDatasets(projectId, location);
    return datasets.map<SelectableValue<string>>((d) => ({ label: d, value: d }));
  }, [projectId, location]);

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

  return (
    <Field label="Default dataset">
      <Select className="width-30" value={value} options={state.value} onChange={onChange} disabled={disabled} />
    </Field>
  );
};
