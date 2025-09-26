import React, { useEffect } from 'react';
import { useAsync } from 'react-use';

import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
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
  className,
  applyDefault,
  inputId,
}) => {
  const state = useAsync(async () => {
    const datasets = await apiClient.getDatasets(location, project);
    return datasets?.map(toOption);
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
    // There is a known issue with ComboBox where user needs to start typing into the input to see the options.
    // See: https://github.com/grafana/grafana/issues/108400
    // Likely not ideal to migrate to ComboBox at this point.
    // TODO: Migrate to ComboBox when the issue is resolved.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    <Select
      className={className}
      aria-label="Dataset selector"
      inputId={inputId}
      value={value}
      options={state.value}
      onChange={onChange}
      disabled={disabled}
      isLoading={state.loading}
      menuShouldPortal={true}
    />
  );
};
