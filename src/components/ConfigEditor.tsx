import React from 'react';

import {
    DataSourcePluginOptionsEditorProps,
    onUpdateDatasourceJsonDataOption,
    onUpdateDatasourceJsonDataOptionSelect
} from '@grafana/data';
import { AuthConfig, GoogleAuthType } from '@grafana/google-sdk';
import { ConfigSection, DataSourceDescription } from '@grafana/plugin-ui';
import { config } from '@grafana/runtime';
import { Combobox, Field, Input, SecureSocksProxySettings, Switch } from '@grafana/ui';

import { PROCESSING_LOCATIONS } from '../constants';
import { BigQueryOptions, BigQuerySecureJsonData, bigQueryAuthTypes } from '../types';

import { ConfigurationHelp } from './/ConfigurationHelp';
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

  const onRestrictToAccessibleDatasetsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        restrictToAccessibleDatasets: event.target.checked,
      },
    });
  };

  const showServiceAccountImpersonation =
    jsonData.authenticationType === GoogleAuthType.JWT || jsonData.authenticationType === GoogleAuthType.GCE;

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

      <AuthConfig
        options={options}
        onOptionsChange={onOptionsChange}
        authOptions={bigQueryAuthTypes}
        showServiceAccountImpersonationConfig={showServiceAccountImpersonation}
      />

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
          <Combobox
            width={60}
            placeholder="Automatic location selection"
            value={jsonData.processingLocation || ''}
            options={PROCESSING_LOCATIONS}
            onChange={onUpdateDatasourceJsonDataOptionSelect(props, 'processingLocation')}
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
        <Field
          label="Restrict to accessible datasets"
          description="Reject queries that reference tables outside the projects this data source has access to, for example public datasets. Every query is checked with a dry run before it executes."
        >
          <Switch
            value={jsonData.restrictToAccessibleDatasets || false}
            onChange={onRestrictToAccessibleDatasetsChange}
          />
        </Field>
        {jsonData.restrictToAccessibleDatasets && (
          <Field
            label="Additional allowed datasets"
            description={
              <span>
                Comma-separated list of datasets outside the accessible projects that queries may also reference,
                entered as <code>project.dataset</code> or <code>dataset</code> (in the default project). Use this for
                public or shared datasets you want to allow.
              </span>
            }
          >
            <Input
              className="width-30"
              placeholder="Optional, example: bigquery-public-data.samples"
              type={'string'}
              value={jsonData.additionalAllowedDatasets || ''}
              onChange={onUpdateDatasourceJsonDataOption(props, 'additionalAllowedDatasets')}
            />
          </Field>
        )}

        {config.secureSocksDSProxyEnabled && (
          <SecureSocksProxySettings options={options} onOptionsChange={onOptionsChange} />
        )}
      </ConfigSection>
    </>
  );
};
