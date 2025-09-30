import React, { useId } from 'react';
import { QueryEditorProps, QueryRowFilter } from 'types';
import { BQOrderByRow } from './BQOrderByRow';
import { BQSelectRow } from './BQSelectRow';
import { BQWhereRow } from './BQWhereRow';
import { Preview } from './Preview';
import { BQGroupByRow } from './BQGroupByRow';
import { QueryToolbox } from 'components/query-editor-raw/QueryToolbox';
import { EditorRows, EditorRow, EditorField, QueryOptionGroup } from '@grafana/plugin-ui';
import { InlineSwitch } from '@grafana/ui';

interface VisualEditorProps extends QueryEditorProps {
  queryRowFilter: QueryRowFilter;
  onValidate: (isValid: boolean) => void;
}
export const VisualEditor: React.FC<VisualEditorProps> = ({
  query,
  apiClient,
  queryRowFilter,
  onChange,
  onValidate,
  range,
}) => {
  const htmlId = useId();
  const onStorageApiChange = () => {
    const next = { ...query, enableStorageAPI: !query.enableStorageAPI };
    onChange(next);
  };

  return (
    <>
      <EditorRows>
        <EditorRow>
          <BQSelectRow query={query} onQueryChange={onChange} />
        </EditorRow>
        {queryRowFilter.filter && (
          <EditorRow>
            <EditorField label="Filter by column value" optional>
              <BQWhereRow apiClient={apiClient} query={query} onQueryChange={onChange} />
            </EditorField>
          </EditorRow>
        )}
        {queryRowFilter.group && (
          <EditorRow>
            <EditorField label="Group by column">
              <BQGroupByRow query={query} onQueryChange={onChange} />
            </EditorField>
          </EditorRow>
        )}
        {queryRowFilter.order && (
          <EditorRow>
            <BQOrderByRow query={query} onQueryChange={onChange} />
          </EditorRow>
        )}
        {queryRowFilter.preview && query.rawSql && (
          <EditorRow>
            <Preview rawSql={query.rawSql} />
          </EditorRow>
        )}
        <EditorRow>
          <QueryOptionGroup
            title="Options"
            collapsedInfo={[`Use Storage API: ${query.enableStorageAPI ? 'enabled' : 'disabled'}`]}
          >
            <InlineSwitch
              id={`${htmlId}-storage-api`}
              label="Use Storage API"
              transparent={true}
              showLabel={true}
              value={query.enableStorageAPI}
              onChange={onStorageApiChange}
            />
          </QueryOptionGroup>
        </EditorRow>
      </EditorRows>
      <QueryToolbox apiClient={apiClient} query={query} onValidate={onValidate} range={range} />
    </>
  );
};
