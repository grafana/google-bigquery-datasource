import { DataSourcePluginOptionsEditorProps, onUpdateDatasourceJsonDataOptionSelect } from '@grafana/data';
import { AuthConfig, GOOGLE_AUTH_TYPE_OPTIONS } from '@grafana/google-sdk';
import { config } from '@grafana/runtime';
import { Field, Input, SecureSocksProxySettings, Select } from '@grafana/ui';
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

  const onMaxBillableBytesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        maxBillableBytes: Number(event.target.value),
      },
    });
  };

  const onOnDemandComputePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        onDemandComputePrice: Number(event.target.value),
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
            placeholder="Default US"
            value={jsonData.processingLocation || ''}
            options={PROCESSING_LOCATIONS}
            onChange={onUpdateDatasourceJsonDataOptionSelect(props, 'processingLocation')}
            menuShouldPortal={true}
          />
        </Field>
        <Field
          label="Max billable bytes"
          description={
            <span>
              Prevent queries that would process more than this amount of bytes. Read more about max billable bytes{' '}
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
            value={jsonData.maxBillableBytes || ''}
            onChange={onMaxBillableBytesChange}
          />
        </Field>
        <Field
          label="On-demand compute price (cost per terabyte)"
          description={
            <span>
              Only used for display purposes. If not defined, estimates will still be shown as bytes. Read more about
              Bigquery pricing{' '}
              <a
                href="https://cloud.google.com/bigquery/pricing"
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
            placeholder="Optional, example 6.25"
            type={'number'}
            value={jsonData.onDemandComputePrice || ''}
            onChange={onOnDemandComputePriceChange}
          />
        </Field>

        {config.secureSocksDSProxyEnabled && (
          <SecureSocksProxySettings options={options} onOptionsChange={onOptionsChange} />
        )}
      </ConfigSection>
    </>
  );
};
