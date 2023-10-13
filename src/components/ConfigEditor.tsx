import { css } from '@emotion/css';
import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOptionChecked,
  onUpdateDatasourceJsonDataOptionSelect,
} from '@grafana/data';
import { AuthConfig, GOOGLE_AUTH_TYPE_OPTIONS } from '@grafana/google-sdk';
import { config } from '@grafana/runtime';
import { Field, FieldSet, InlineField, Select, Switch } from '@grafana/ui';
import React from 'react';
import { PROCESSING_LOCATIONS } from '../constants';
import { BigQueryOptions, BigQuerySecureJsonData } from '../types';
import { ConfigurationHelp } from './/ConfigurationHelp';

const styles = {
  toggle: css`
    margin-top: 7px;
    margin-left: 5px;
  `,
};

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

        {config.secureSocksDSProxyEnabled && (
          <>
            <InlineField
              label="Secure Socks Proxy"
              tooltip={
                <>
                  Enable proxying the datasource connection through the secure socks proxy to a different network. See{' '}
                  <a
                    href="https://grafana.com/docs/grafana/next/setup-grafana/configure-grafana/proxy/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Configure a datasource connection proxy.
                  </a>
                </>
              }
            >
              <div className={styles.toggle}>
                <Switch
                  value={options.jsonData.enableSecureSocksProxy}
                  onChange={onUpdateDatasourceJsonDataOptionChecked(props, 'enableSecureSocksProxy')}
                />
              </div>
            </InlineField>
          </>
        )}
      </FieldSet>
    </>
  );
};
