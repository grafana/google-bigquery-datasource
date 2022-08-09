import {
  DataSourcePluginOptionsEditorProps,
  onUpdateDatasourceJsonDataOption,
  onUpdateDatasourceJsonDataOptionSelect,
} from '@grafana/data';
import { Field, FieldSet, Input, RadioButtonGroup, Select } from '@grafana/ui';

import React from 'react';
import { JWTConfigEditor } from './JWTConfigEditor';
import { JWTForm } from './JWTForm';
import { ConfigurationHelp } from './/ConfigurationHelp';
import { GOOGLE_AUTH_TYPE_OPTIONS, PROCESSING_LOCATIONS } from '../constants';
import { BigQueryOptions, BigQuerySecureJsonData, GoogleAuthType } from '../types';

export type BigQueryConfigEditorProps = DataSourcePluginOptionsEditorProps<BigQueryOptions, BigQuerySecureJsonData>;

const isJWTAuth = (authenticationType: GoogleAuthType): boolean => {
  return authenticationType === GoogleAuthType.JWT || authenticationType === undefined;
};

export const BigQueryConfigEditor: React.FC<BigQueryConfigEditorProps> = (props) => {
  const { options, onOptionsChange } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;
  if (!jsonData.authenticationType) {
    jsonData.authenticationType = GoogleAuthType.JWT;
  }

  const [jwtAuth, setJWTAuth] = React.useState<boolean>(isJWTAuth(jsonData.authenticationType));

  const getJTWConfig = (): boolean =>
    Boolean(
      jsonData.clientEmail &&
        jsonData.defaultProject &&
        jsonData.tokenUri &&
        ((secureJsonFields && secureJsonFields.privateKey) || jsonData.privateKeyPath)
    );

  const [configEditorVisible, setConfigEditorVisible] = React.useState<boolean>(getJTWConfig());

  const showConfigEditor = (): void => {
    setConfigEditorVisible(true);
  };

  const onAuthTypeChange = (authenticationType: GoogleAuthType) => {
    setConfigEditorVisible(getJTWConfig());
    onResetApiKey({ authenticationType });
    setJWTAuth(isJWTAuth(authenticationType));
  };

  const onResetApiKey = (jsonData?: Partial<BigQueryOptions>) => {
    const nextSecureJsonData = { ...secureJsonData };
    const nextJsonData = !jsonData ? { ...options.jsonData } : { ...options.jsonData, ...jsonData };

    delete nextJsonData.clientEmail;
    delete nextJsonData.defaultProject;
    delete nextJsonData.tokenUri;
    delete nextJsonData.privateKeyPath;
    delete nextSecureJsonData.privateKey;

    setJWTAuth(true);
    setConfigEditorVisible(false);
    onOptionsChange({
      ...options,
      secureJsonFields: { ...options.secureJsonFields, privateKey: false },
      secureJsonData: nextSecureJsonData,
      jsonData: nextJsonData,
    });
  };

  const onJWTFormChange = (key: keyof BigQueryOptions) => onUpdateDatasourceJsonDataOption(props, key);

  return (
    <>
      <ConfigurationHelp />

      <FieldSet label="Authentication">
        <Field
          label="Authentication type"
          description="Switching the authentication type resets the existing configuration"
        >
          <RadioButtonGroup
            options={GOOGLE_AUTH_TYPE_OPTIONS}
            value={jsonData.authenticationType || GoogleAuthType.JWT}
            onChange={onAuthTypeChange}
          />
        </Field>
      </FieldSet>

      {jwtAuth && (
        <FieldSet label="JWT Key Details">
          {configEditorVisible ? (
            <JWTForm
              options={options.jsonData}
              hasPrivateKeyConfigured={Boolean(options.secureJsonFields.privateKey)}
              onReset={() => onResetApiKey()}
              onChange={onJWTFormChange}
            />
          ) : (
            <JWTConfigEditor
              showConfigEditor={showConfigEditor}
              onChange={(jwt) => {
                onOptionsChange({
                  ...options,
                  secureJsonFields: { ...secureJsonFields, privateKey: true },
                  secureJsonData: {
                    ...secureJsonData,
                    privateKey: jwt.privateKey,
                  },
                  jsonData: {
                    ...jsonData,
                    clientEmail: jwt.clientEmail,
                    defaultProject: jwt.projectId,
                    tokenUri: jwt.tokenUri,
                  },
                });
              }}
            />
          )}{' '}
        </FieldSet>
      )}

      <FieldSet label="Other settings">
        {!jwtAuth && (
          <Field label="Default project" description="GCP project where BigQuery jobs will be created">
            <Input
              id="defaultProject"
              width={60}
              value={jsonData.defaultProject || ''}
              onChange={onUpdateDatasourceJsonDataOption(props, 'defaultProject')}
            />
          </Field>
        )}
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
