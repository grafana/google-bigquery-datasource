import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOptionChecked,
  onUpdateDatasourceJsonDataOptionSelect,
} from '@grafana/data';
import { Field, FieldSet, Select, InlineField, Switch } from '@grafana/ui';
import { AuthConfig, GOOGLE_AUTH_TYPE_OPTIONS } from '@grafana/google-sdk';
import { config } from '@grafana/runtime';

import React from 'react';
import { ConfigurationHelp } from './/ConfigurationHelp';
import { PROCESSING_LOCATIONS } from '../constants';
import { BigQueryOptions, BigQuerySecureJsonData } from '../types';
import { gte } from 'semver';
import { css } from '@emotion/css';

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

        {config.featureToggles['secureSocksDSProxyEnabled'] && gte(config.buildInfo.version, '10.0.0-0') && (
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
