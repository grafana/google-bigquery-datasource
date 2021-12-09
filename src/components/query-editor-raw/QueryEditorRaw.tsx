import React, { useMemo, useRef, useEffect } from 'react';
import { BigQueryQueryNG } from '../../bigquery_query';
import { TableSchema } from 'api';
import { SQLEditor } from 'components/sql-editor/SQLEditor';
import { ColumnDefinition, TableDefinition } from 'components/sql-editor/types';
import { getBigQueryCompletionProvider } from './bigqueryCompletionProvider';

type Props = {
  query: BigQueryQueryNG;
  getTables: (d?: string) => Promise<Array<TableDefinition>>;
  getColumns: (t: string) => Promise<Array<ColumnDefinition>>;
  getSchema?: () => TableSchema | null;
  onChange: (value: BigQueryQueryNG) => void;
  onRunQuery: () => void;
};

export function QueryEditorRaw(props: Props) {
  const getColumns = useRef<Props['getColumns']>(props.getColumns);
  const getTables = useRef<Props['getTables']>(props.getTables);
  const completionProvider = useMemo(() => getBigQueryCompletionProvider({ getColumns, getTables }), []);

  useEffect(() => {
    getColumns.current = props.getColumns;
    getTables.current = props.getTables;
  }, [props.getColumns, props.getTables]);

  const onRawSqlChange = (rawSql: string) => {
    const query = {
      ...props.query,
      rawQuery: true,
      rawSql,
    };
    props.onChange(query);
  };

  return (
    <SQLEditor query={props.query.rawSql} onChange={onRawSqlChange} language={{ id: 'bigquery', completionProvider }} />
  );
}
