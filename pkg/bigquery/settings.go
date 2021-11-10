package bigquery

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
	"github.com/grafana/grafana-google-sdk-go/pkg/tokenprovider"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

// Settings - data loaded from grafana settings database

type Credentials struct {
	Type        string `json:"type"`
	ProjectID   string `json:"project_id"`
	ClientEmail string `json:"client_email"`
	PrivateKey  string `json:"private_key"`
	TokenURI    string `json:"token_uri"`
}

// LoadSettings will read and validate Settings from the DataSourceConfg
func LoadSettings(config backend.DataSourceInstanceSettings) (types.BigQuerySettings, error) {
	settings := types.BigQuerySettings{}
	if err := json.Unmarshal(config.JSONData, &settings); err != nil {
		return settings, fmt.Errorf("could not unmarshal DataSourceInfo json: %w", err)
	}

	settings.PrivateKey = config.DecryptedSecureJSONData["privateKey"]
	settings.DatasourceId = config.ID
	settings.Updated = config.Updated

	return settings, nil
}

func getConnectionSettings(settings types.BigQuerySettings, queryArgs *ConnectionArgs) types.ConnectionSettings {
	connectionSettings := types.ConnectionSettings{
		Project:            settings.DefaultProject,
		Location:           settings.ProcessingLocation,
		AuthenticationType: settings.AuthenticationType,
	}

	if queryArgs.Project != "" {
		connectionSettings.Project = queryArgs.Project
	}

	if queryArgs.Location != "" {
		connectionSettings.Location = queryArgs.Location
	}

	if queryArgs.Dataset != "" {
		connectionSettings.Dataset = queryArgs.Dataset
	}

	if queryArgs.Project != "" {
		connectionSettings.Project = queryArgs.Project
	}

	return connectionSettings
}

var bigqueryRoute = struct {
	path   string
	method string
	url    string
	scopes []string
}{
	path:   "bigquery",
	method: "GET",
	url:    "https://www.googleapis.com/auth/bigquery",
	scopes: []string{"https://www.googleapis.com/auth/bigquery",
		"https://www.googleapis.com/auth/bigquery.insertdata",
		"https://www.googleapis.com/auth/cloud-platform",
		"https://www.googleapis.com/auth/cloud-platform.read-only",
		"https://www.googleapis.com/auth/devstorage.full_control",
		"https://www.googleapis.com/auth/devstorage.read_only",
		"https://www.googleapis.com/auth/devstorage.read_write"},
}

func getMiddleware(settings types.BigQuerySettings) (httpclient.Middleware, error) {
	providerConfig := tokenprovider.Config{
		RoutePath:         bigqueryRoute.path,
		RouteMethod:       bigqueryRoute.method,
		DataSourceID:      settings.DatasourceId,
		DataSourceUpdated: settings.Updated,
		Scopes:            bigqueryRoute.scopes,
	}

	var provider tokenprovider.TokenProvider
	switch settings.AuthenticationType {
	case "gce":
		provider = tokenprovider.NewGceAccessTokenProvider(providerConfig)
	case "jwt":
		providerConfig.JwtTokenConfig = &tokenprovider.JwtTokenConfig{
			Email:      settings.ClientEmail,
			URI:        settings.TokenUri,
			PrivateKey: []byte(settings.PrivateKey),
		}
		provider = tokenprovider.NewJwtAccessTokenProvider(providerConfig)
	}

	return tokenprovider.AuthMiddleware(provider), nil
}

func newHTTPClient(settings types.BigQuerySettings, opts httpclient.Options) (*http.Client, error) {
	m, err := getMiddleware(settings)
	if err != nil {
		return nil, err
	}

	opts.Middlewares = append(opts.Middlewares, m)
	return httpclient.New(opts)
}
