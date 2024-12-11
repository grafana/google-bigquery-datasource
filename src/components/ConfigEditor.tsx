import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOptionSelect,
  onUpdateDatasourceJsonDataOption,
} from '@grafana/data';
import { AuthConfig, GOOGLE_AUTH_TYPE_OPTIONS } from '@grafana/google-sdk';
import { config } from '@grafana/runtime';
import { Field, Input, SecureSocksProxySettings, Select } from '@grafana/ui';
import React from 'react';
import { PROCESSING_LOCATIONS } from '../constants';
import { BigQueryOptions, BigQuerySecureJsonData } from '../types';
import { ConfigurationHelp } from './/ConfigurationHelp';
import { ConfigSection, DataSourceDescription } from '@grafana/plugin-ui';
import { Divider } from './Divider';

export type BigQueryConfigEditorProps = DataSourcePluginOptionsEditorProps<BigQueryOptions, BigQuerySecureJsonData>;

export const BigQueryConfigEditor: React.FC<BigQueryConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData } = options;

  const onMaxBytesBilledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        MaxBytesBilled: Number(event.target.value),
      },
    });
  };

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
        <Field
          label="Service endpoint"
          description={
            <span>
              Specifies the network address of an API service. Read more about service endpoint{' '}
              <a
                href="https://cloud.google.com/bigquery/docs/reference/rest#service-endpoint"
                rel="noreferrer"
                className="external-link"
                target="_blank"
              >
                here
              </a>
            </span>
          }
        >
          <Input
            className="width-30"
            placeholder="Optional, example https://bigquery.googleapis.com/bigquery/v2/"
            type={'string'}
            value={jsonData.serviceEndpoint || ''}
            onChange={onUpdateDatasourceJsonDataOption(props, 'serviceEndpoint')}
          />
        </Field>
        <Field
          label="Max bytes billed"
          description={
            <span>
              Prevent queries that would process more than this amount of bytes. Read more about max bytes billed{' '}
              <a
                href="https://cloud.google.com/bigquery/docs/best-practices-costs"
                rel="noreferrer"
                className="external-link"
                target="_blank"
              >
                here
              </a>
            </span>
          }
        >
          <Input
            className="width-30"
            placeholder="Optional, example 5242880"
            type={'number'}
            value={jsonData.MaxBytesBilled || ''}
            onChange={onMaxBytesBilledChange}
          />
        </Field>

        {config.secureSocksDSProxyEnabled && (
          <SecureSocksProxySettings options={options} onOptionsChange={onOptionsChange} />
        )}
      </ConfigSection>
    </>
  );
};
