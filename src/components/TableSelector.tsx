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
  inputId?: string;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  apiClient,
  query,
  value,
  className,
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
    // There is a known issue with ComboBox where user needs to start typing into the input to see the options.
    // See: https://github.com/grafana/grafana/issues/108400
    // Likely not ideal to migrate to ComboBox at this point.
    // TODO: Migrate to ComboBox when the issue is resolved.z
    // eslint-disable-next-line deprecation/deprecation
    <Select
      className={className}
      disabled={state.loading}
      inputId={inputId}
      aria-label="Table selector"
      value={value}
      options={state.value}
      onChange={onChange}
      isLoading={state.loading}
      menuShouldPortal={true}
      placeholder={state.loading ? 'Loading tables' : 'Select table'}
    />
  );
};
