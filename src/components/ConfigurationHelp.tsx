import React from 'react';
import { Collapse } from '@grafana/ui';

export const ConfigurationHelp = () => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <Collapse
      collapsible
      label="How to configure Google BigQuery datasource?"
      isOpen={isOpen}
      onToggle={() => setIsOpen((x) => !x)}
    >
      <h5>Uploading Google Service Account key</h5>
      <p>
        Create a{' '}
        <a
          className="external-link"
          rel="noreferrer"
          href="https://cloud.google.com/iam/docs/creating-managing-service-accounts"
          target="_blank"
        >
          Google Cloud Platform (GCP) Service Account
        </a>{' '}
        on the project you want to show data. The <strong>BigQuery Data Viewer</strong> role and the{' '}
        <strong>Job User</strong> role provide all the permissions that Grafana needs. The{' '}
        <a
          className="external-link"
          rel="noreferrer"
          target="_blank"
          href="https://console.cloud.google.com/apis/library/bigquery.googleapis.com"
        >
          BigQuery API
        </a>{' '}
        has to be enabled on GCP for the data source to work.
      </p>

      <h5>Using GCE Default Service Account</h5>
      <p>
        When Grafana is running on a Google Compute Engine (GCE) virtual machine, it is possible for Grafana to
        automatically retrieve the default project id and authentication token from the metadata server. For this to
        work, you need to make sure that you have a service account that is setup as the default account for the virtual
        machine and that the service account has been given read access to the BigQuery API.
      </p>

      <p>
        <strong>
          Note that, Grafana data source integrates with a single GCP project. If you need to visualize data from
          multiple GCP projects, create one data source per GCP project.
        </strong>
      </p>
    </Collapse>
  );
};
