import React, { type ComponentProps } from 'react';

import { type CustomVariableSupport } from '@grafana/data';

import { QueryEditor } from '@/components/QueryEditor';
import { type BigQueryDatasource } from '@/datasource';
import { type BigQueryQueryNG } from '@/types';

type Props = ComponentProps<CustomVariableSupport<BigQueryDatasource, BigQueryQueryNG>['editor']>;

export function VariableEditor(props: Props) {
  return <QueryEditor {...props} query={{ ...props.query, refId: 'tempvar' }} showRunButton={false} />;
}
