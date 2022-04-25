import { SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import React, { useEffect } from 'react';
import { useAsync } from 'react-use';
import { ResourceSelectorProps } from 'types';

interface ProjectSelectorProps extends Omit<ResourceSelectorProps, 'location'> {
  value?: string;
  applyDefault?: boolean;
  disabled?: boolean;
  onChange: (v: SelectableValue) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  apiClient,
  value,
  onChange,
  disabled,
  className,
  applyDefault,
}) => {
  const state = useAsync(async () => {
    const projects = await apiClient.getProjects();
    return projects.map((project) => ({ label: project.displayName, value: project.projectId }));
  }, []);

  useEffect(() => {
    if (!applyDefault) {
      return;
    }
    // Set default project when values are fetched
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
  }, [state.value, value, applyDefault, onChange]);

  return (
    <Select
      className={className}
      aria-label="Project selector"
      value={value}
      options={state.value}
      onChange={onChange}
      disabled={disabled}
      isLoading={state.loading}
      menuShouldPortal={true}
    />
  );
};
