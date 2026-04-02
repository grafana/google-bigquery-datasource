import React, { useId } from 'react';

import { EditorField, EditorRow, EditorRows, QueryOptionGroup } from '@grafana/plugin-ui';
import { InlineSwitch } from '@grafana/ui';

import { QueryToolbox } from '@/components/query-editor-raw/QueryToolbox';
import { BQGroupByRow } from '@/components/visual-query-builder/BQGroupByRow';
import { BQOrderByRow } from '@/components/visual-query-builder/BQOrderByRow';
import { BQSelectRow } from '@/components/visual-query-builder/BQSelectRow';
import { BQWhereRow } from '@/components/visual-query-builder/BQWhereRow';
import { Preview } from '@/components/visual-query-builder/Preview';
import { QueryEditorProps, QueryRowFilter } from '@/types';

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
