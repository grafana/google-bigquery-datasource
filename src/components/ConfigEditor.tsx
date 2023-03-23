import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOptionSelect,
} from '@grafana/data';
import { Field, FieldSet, Select } from '@grafana/ui';
import { AuthConfig, GOOGLE_AUTH_TYPE_OPTIONS } from '@grafana/google-sdk';

import React from 'react';
import { ConfigurationHelp } from './/ConfigurationHelp';
import { PROCESSING_LOCATIONS } from '../constants';
import { BigQueryOptions, BigQuerySecureJsonData } from '../types';

export type BigQueryConfigEditorProps = DataSourcePluginOptionsEditorProps<BigQueryOptions, BigQuerySecureJsonData>;

export const BigQueryConfigEditor: React.FC<BigQueryConfigEditorProps> = (props) => {
  const { options } = props;
  const { jsonData } = options;

  return (
    <>
      <ConfigurationHelp />

      <AuthConfig {...props} authOptions={GOOGLE_AUTH_TYPE_OPTIONS} />

      <FieldSet label="Other settings">
        <Field
          label="Processing location"
          description={
            <span>
              Read more about processing location{' '}
              <a
                href="https://cloud.google.com/bigquery/docs/locations"
                rel="noreferrer"
                className="external-link"
                target="_blank"
              >
                here
              </a>
            </span>
          }
        >
          <Select
            className="width-30"
            placeholder="Default US"
            value={jsonData.processingLocation || ''}
            options={PROCESSING_LOCATIONS}
            onChange={onUpdateDatasourceJsonDataOptionSelect(props, 'processingLocation')}
            menuShouldPortal={true}
          />
        </Field>
      </FieldSet>
    </>
  );
};
