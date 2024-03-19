package bigquery

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
	"github.com/grafana/grafana-google-sdk-go/pkg/utils"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// Settings - data loaded from grafana settings database

type Credentials struct {
	Type        string `json:"type"`
	ProjectID   string `json:"project_id"`
	ClientEmail string `json:"client_email"`
	PrivateKey  string `json:"private_key"`
	TokenURI    string `json:"token_uri"`
}

// loadSettings will read and validate Settings from the DataSourceInstanceSettings
func loadSettings(config *backend.DataSourceInstanceSettings) (types.BigQuerySettings, error) {
	settings := types.BigQuerySettings{}
	err := json.Unmarshal(config.JSONData, &settings)
	if err != nil {
		return settings, fmt.Errorf("could not unmarshal DataSourceInfo json: %w", err)
	}

	settings.PrivateKey, err = utils.GetPrivateKey(config)
	if err != nil {
		return settings, err
	}

	settings.DatasourceId = config.ID
	settings.Updated = config.Updated

	return settings, nil
}

func getConnectionSettings(settings types.BigQuerySettings, queryArgs *ConnectionArgs, isQueryArgsSet bool) types.ConnectionSettings {
	connectionSettings := types.ConnectionSettings{
		Project:            settings.DefaultProject,
		Location:           settings.ProcessingLocation,
		AuthenticationType: settings.AuthenticationType,
	}

	// We want to set the location to empty string only if query args are set
	if isQueryArgsSet  {
		connectionSettings.Location = queryArgs.Location
	}

	if queryArgs.Dataset != "" {
		connectionSettings.Dataset = queryArgs.Dataset
	}

	if queryArgs.Headers != nil {
		connectionSettings.Headers = queryArgs.Headers
	}

	return connectionSettings
}
