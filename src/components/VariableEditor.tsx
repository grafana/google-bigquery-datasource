import { CustomVariableSupport } from '@grafana/data';
import React, { ComponentProps } from 'react';
import { BigQueryDatasource } from '../datasource';
import { BigQueryQueryNG } from '../types';
import { QueryEditor } from './QueryEditor';

type Props = ComponentProps<CustomVariableSupport<BigQueryDatasource, BigQueryQueryNG>['editor']>;

export function VariableEditor(props: Props) {
  return <QueryEditor {...props} query={{ ...props.query, refId: 'tempvar' }} showRunButton={false} />;
}
