import { SelectableValue } from '@grafana/data';
import { Combobox } from '@grafana/ui';
import React, { useEffect } from 'react';
import { useAsync } from 'react-use';
import { ResourceSelectorProps } from 'types';
import { toOption } from 'utils/data';

interface DatasetSelectorProps extends ResourceSelectorProps {
  value: string | null;
  project: string;
  location: string;
  applyDefault?: boolean;
  disabled?: boolean;
  onChange: (v: SelectableValue) => void;
  inputId?: string;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  apiClient,
  location,
  value,
  project,
  onChange,
  disabled,
  applyDefault,
  inputId,
}) => {
  const state = useAsync(async () => {
    const datasets = await apiClient.getDatasets(location, project);
    return datasets.map(toOption);
  }, [location, project]);

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
        // if value is set and newly fetched values does not contain selected value
        if (state.value.length > 0) {
          onChange(state.value[0]);
        }
      }
    }
  }, [state.value, value, location, applyDefault, onChange]);

  return (
    <Combobox
      aria-label="Dataset selector"
      id={inputId}
      value={value}
      options={state.value ?? []}
      onChange={onChange}
      disabled={disabled}
      loading={state.loading}
    />
  );
};
