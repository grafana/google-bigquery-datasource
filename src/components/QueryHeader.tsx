import React, { useCallback, useId, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { EditorField, EditorHeader, EditorMode, EditorRow, FlexItem, InlineSelect, Space } from '@grafana/plugin-ui';
import { Button, InlineSwitch, RadioButtonGroup, Tooltip, useStyles2 } from '@grafana/ui';
import { BigQueryAPI } from 'api';
import { toRawSql } from 'utils/sql.utils';

import { PROCESSING_LOCATIONS, QUERY_FORMAT_OPTIONS } from '../constants';
import { BigQueryQueryNG, QueryFormat, QueryRowFilter, QueryWithDefaults } from '../types';

import { ConfirmModal } from './ConfirmModal';
import { DatasetSelector } from './DatasetSelector';
import { ProjectSelector } from './ProjectSelector';
import { TableSelector } from './TableSelector';

interface QueryHeaderProps {
  query: QueryWithDefaults;
  onChange: (query: BigQueryQueryNG) => void;
  onRunQuery: () => void;
  onQueryRowChange: (queryRowFilter: QueryRowFilter) => void;
  queryRowFilter: QueryRowFilter;
  apiClient: BigQueryAPI;
  isQueryRunnable: boolean;
  showRunButton?: boolean;
}

const editorModes = [
  { label: 'Builder', value: EditorMode.Builder },
  { label: 'Code', value: EditorMode.Code },
];

export function QueryHeader({
  query,
  queryRowFilter,
  onChange,
  onRunQuery,
  onQueryRowChange,
  apiClient,
  isQueryRunnable,
  showRunButton = true,
}: QueryHeaderProps) {
  const { location, editorMode } = query;
  const [_, copyToClipboard] = useCopyToClipboard();
  const [showConfirm, setShowConfirm] = useState(false);
  const htmlId = useId();
  const styles = useStyles2(getStyles);

  const onEditorModeChange = useCallback(
    (newEditorMode: EditorMode) => {
      if (editorMode === EditorMode.Code) {
        setShowConfirm(true);
        return;
      }
      onChange({ ...query, editorMode: newEditorMode });
    },
    [editorMode, onChange, query]
  );

  const onFormatChange = (e: SelectableValue) => {
    const next = { ...query, format: e.value !== undefined ? e.value : QueryFormat.Table };
    onChange(next);
  };

  const onDatasetChange = (e: SelectableValue) => {
    if (e.value === query.dataset) {
      return;
    }

    const next = {
      ...query,
      dataset: e.value,
      table: undefined,
      sql: undefined,
      rawSql: '',
    };

    onChange(next);
  };

  const onProjectChange = (e: SelectableValue) => {
    if (e.value === query.project) {
      return;
    }

    const next = {
      ...query,
      project: e.value,
      dataset: undefined,
      table: undefined,
      sql: undefined,
      rawSql: '',
    };

    onChange(next);
  };

  const onTableChange = (e: SelectableValue) => {
    if (e.value === query.table) {
      return;
    }

    const next: BigQueryQueryNG = {
      ...query,
      table: e.value,
      sql: undefined,
      rawSql: '',
    };
    onChange(next);
  };

  const onStorageApiChange = () => {
    const next = { ...query, enableStorageAPI: !query.enableStorageAPI };
    onChange(next);
  };

  function renderRunButton(): React.ReactNode {
    if (!showRunButton) {
      return null;
    }
    if (isQueryRunnable) {
      return (
        <Button icon="play" variant="primary" size="sm" onClick={() => onRunQuery()}>
          Run query
        </Button>
      );
    }
    return (
      <Tooltip
        theme="error"
        content={
          <>
            Your query is invalid. Check below for details. <br />
            However, you can still run this query.
          </>
        }
        placement="top"
      >
        <Button icon="exclamation-triangle" variant="secondary" size="sm" onClick={() => onRunQuery()}>
          Run query
        </Button>
      </Tooltip>
    );
  }

  return (
    <>
      <EditorHeader>
        <InlineSelect
          label="Processing location"
          value={location}
          placeholder="Select location"
          allowCustomValue
          menuShouldPortal
          onChange={({ value }) => value != null && onChange({ ...query, location: value || '' })}
          options={PROCESSING_LOCATIONS}
        />

        <InlineSelect
          label="Format"
          value={query.format}
          placeholder="Select format"
          menuShouldPortal
          onChange={onFormatChange}
          options={QUERY_FORMAT_OPTIONS}
        />

        {editorMode === EditorMode.Code && (
          <InlineSwitch
            id={`${htmlId}-storage-api`}
            label="Use Storage API"
            transparent={true}
            className={styles.storageApiSwitch}
            showLabel={true}
            value={query.enableStorageAPI}
            onChange={onStorageApiChange}
          />
        )}

        {editorMode === EditorMode.Builder && (
          <>
            <InlineSwitch
              id={`bq-filter-${htmlId}}`}
              label="Filter"
              transparent={true}
              showLabel={true}
              value={queryRowFilter.filter}
              onChange={(ev) =>
                ev.target instanceof HTMLInputElement &&
                onQueryRowChange({ ...queryRowFilter, filter: ev.target.checked })
              }
            />

            <InlineSwitch
              id={`bq-group-${htmlId}}`}
              label="Group"
              transparent={true}
              showLabel={true}
              value={queryRowFilter.group}
              onChange={(ev) =>
                ev.target instanceof HTMLInputElement &&
                onQueryRowChange({ ...queryRowFilter, group: ev.target.checked })
              }
            />

            <InlineSwitch
              id={`bq-order-${htmlId}}`}
              label="Order"
              transparent={true}
              showLabel={true}
              value={queryRowFilter.order}
              onChange={(ev) =>
                ev.target instanceof HTMLInputElement &&
                onQueryRowChange({ ...queryRowFilter, order: ev.target.checked })
              }
            />

            <InlineSwitch
              id={`bq-preview-${htmlId}}`}
              label="Preview"
              transparent={true}
              showLabel={true}
              value={queryRowFilter.preview}
              onChange={(ev) =>
                ev.target instanceof HTMLInputElement &&
                onQueryRowChange({ ...queryRowFilter, preview: ev.target.checked })
              }
            />
          </>
        )}

        <FlexItem grow={1} />

        {renderRunButton()}

        <RadioButtonGroup options={editorModes} size="sm" value={editorMode} onChange={onEditorModeChange} />

        <ConfirmModal
          isOpen={showConfirm}
          onCopy={() => {
            setShowConfirm(false);
            copyToClipboard(query.rawSql);
            onChange({
              ...query,
              rawSql: toRawSql(query),
              editorMode: EditorMode.Builder,
            });
          }}
          onDiscard={() => {
            setShowConfirm(false);
            onChange({
              ...query,
              rawSql: toRawSql(query),
              editorMode: EditorMode.Builder,
            });
          }}
          onCancel={() => setShowConfirm(false)}
        />
      </EditorHeader>

      {editorMode === EditorMode.Builder && (
        <>
          <Space v={0.5} />

          <EditorRow>
            <ProjectSelector
              apiClient={apiClient}
              value={query.project}
              onChange={onProjectChange}
              applyDefault
              inputId={`bq-project-${htmlId}`}
            />

            <EditorField label="Dataset" width={25}>
              <DatasetSelector
                apiClient={apiClient}
                location={query.location}
                inputId={`bq-dataset-${htmlId}`}
                value={query.dataset === undefined ? null : query.dataset}
                project={query.project}
                onChange={onDatasetChange}
              />
            </EditorField>

            <EditorField label="Table" width={25}>
              <TableSelector
                apiClient={apiClient}
                query={query}
                inputId={`bq-table-${htmlId}`}
                value={query.table === undefined ? null : query.table}
                onChange={onTableChange}
                applyDefault
              />
            </EditorField>
          </EditorRow>
        </>
      )}
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    storageApiSwitch: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      padding: 0,
    }),
  };
};
