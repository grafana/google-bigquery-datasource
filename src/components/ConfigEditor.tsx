import { DataSourcePluginOptionsEditorProps, onUpdateDatasourceJsonDataOptionSelect } from '@grafana/data';
import { AuthConfig, GOOGLE_AUTH_TYPE_OPTIONS } from '@grafana/google-sdk';
import { config } from '@grafana/runtime';
import { Field, SecureSocksProxySettings, Select } from '@grafana/ui';
import React from 'react';
import { PROCESSING_LOCATIONS } from '../constants';
import { BigQueryOptions, BigQuerySecureJsonData } from '../types';
import { ConfigurationHelp } from './/ConfigurationHelp';
import { ConfigSection, DataSourceDescription } from '@grafana/experimental';
import { Divider } from './Divider';

export type BigQueryConfigEditorProps = DataSourcePluginOptionsEditorProps<BigQueryOptions, BigQuerySecureJsonData>;

export const BigQueryConfigEditor: React.FC<BigQueryConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData } = options;

  return (
    <>
      <DataSourceDescription
        dataSourceName="Google BigQuery"
        docsLink="https://grafana.com/grafana/plugins/grafana-bigquery-datasource/"
        hasRequiredFields={false}
      />

      <Divider />

      <ConfigurationHelp />

      <Divider />

      <AuthConfig {...props} authOptions={GOOGLE_AUTH_TYPE_OPTIONS} />

      <Divider />

      <ConfigSection title="Additional Settings" isCollapsible>
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
            placeholder="Automatic location selection"
            value={jsonData.processingLocation || ''}
            options={PROCESSING_LOCATIONS}
            onChange={onUpdateDatasourceJsonDataOptionSelect(props, 'processingLocation')}
            menuShouldPortal={true}
          />
        </Field>

        {config.secureSocksDSProxyEnabled && (
          <SecureSocksProxySettings options={options} onOptionsChange={onOptionsChange} />
        )}
      </ConfigSection>
    </>
  );
};
