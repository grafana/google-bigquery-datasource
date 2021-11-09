package bigquery

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/api"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/driver"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/grafana/sqlds/v2"
	"github.com/pkg/errors"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
)

type BigqueryDatasourceIface interface {
	sqlds.Driver
	GetGCEDefaultProject(ctx context.Context, options sqlds.Options) (string, error)
	Datasets(ctx context.Context, options sqlds.Options) ([]string, error)
	Tables(ctx context.Context, options sqlds.Options) ([]string, error)
	TableSchema(ctx context.Context, options sqlds.Options) (*types.TableMetadataResponse, error)
}

type conn struct {
	db     *sql.DB
	driver *driver.Driver
}
type BigQueryDatasource struct {
	apiClients  sync.Map
	connections sync.Map
	config      sync.Map
}

type ConnectionArgs struct {
	Project  string `json:"project,omitempty"`
	Dataset  string `json:"dataset,omitempty"`
	Table    string `json:"table,omitempty"`
	Location string `json:"location,omitempty"`
}

func New() *BigQueryDatasource {
	return &BigQueryDatasource{}
}

func (s *BigQueryDatasource) Connect(config backend.DataSourceInstanceSettings, queryArgs json.RawMessage) (*sql.DB, error) {
	log.DefaultLogger.Info("Connecting to BigQuery")

	settings, err := LoadSettings(config)

	if err != nil {
		return nil, err
	}

	s.config.Store(config.ID, settings)

	args, err := parseConnectionArgs(queryArgs)
	if err != nil {
		return nil, err
	}

	connectionSettings := getConnectionSettings(settings, args)
	connectionKey := fmt.Sprintf("%d/%s:%s", config.ID, args.Project, args.Dataset)

	c, exists := s.connections.Load(connectionKey)

	if exists {
		connection := c.(conn)
		if !connection.driver.Closed() {
			log.DefaultLogger.Info("Reusing existing connection to BigQuery")
			return connection.db, nil
		}
	} else {
		log.DefaultLogger.Info("Creating new connection to BigQuery")
	}

	client, err := newHTTPClient(settings, httpclient.Options{})
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to crate http client")
	}

	dr, db, err := driver.Open(connectionSettings, client)

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to connect to database. Is the hostname and port correct?")
	}

	s.connections.Store(connectionKey, conn{db: db, driver: dr})

	return db, nil

}

func (s *BigQueryDatasource) Converters() (sc []sqlutil.Converter) {
	return sc
}

func (s *BigQueryDatasource) FillMode() *data.FillMissing {
	return &data.FillMissing{
		Mode: data.FillModeNull,
	}
}

func (s *BigQueryDatasource) Settings(_ backend.DataSourceInstanceSettings) sqlds.DriverSettings {
	return sqlds.DriverSettings{
		FillMode: &data.FillMissing{
			Mode: data.FillModeNull,
		},
	}
}

func (s *BigQueryDatasource) GetGCEDefaultProject(ctx context.Context, options sqlds.Options) (string, error) {
	defaultCredentials, err := google.FindDefaultCredentials(ctx, "https://www.googleapis.com/auth/bigquery")
	if err != nil {
		return "", fmt.Errorf("failed to retrieve default project from GCE metadata server: %w", err)
	}
	token, err := defaultCredentials.TokenSource.Token()
	if err != nil {
		return "", fmt.Errorf("failed to retrieve GCP credential token: %w", err)
	}
	if !token.Valid() {
		return "", errors.New("failed to validate GCP credentials")
	}

	return defaultCredentials.ProjectID, nil

}

func (s *BigQueryDatasource) Datasets(ctx context.Context, options sqlds.Options) ([]string, error) {
	project, location := options["project"], options["location"]

	apiClient, err := s.getApi(ctx, project, location)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	return apiClient.ListDatasets(ctx)
}

func (s *BigQueryDatasource) Tables(ctx context.Context, options sqlds.Options) ([]string, error) {
	project, dataset, location := options["project"], options["dataset"], options["location"]
	apiClient, err := s.getApi(ctx, project, location)

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	return apiClient.ListTables(ctx, dataset)
}

func (s *BigQueryDatasource) TableSchema(ctx context.Context, options sqlds.Options) (*types.TableMetadataResponse, error) {
	project, dataset, table, location := options["project"], options["dataset"], options["table"], options["location"]
	apiClient, err := s.getApi(ctx, project, location)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	return apiClient.GetTableSchema(ctx, dataset, table)

}

func (s *BigQueryDatasource) getApi(ctx context.Context, project, location string) (*api.API, error) {
	datasourceID := getDatasourceID(ctx)
	clientId := fmt.Sprintf("%d/%s", datasourceID, project)
	settings, exists := s.config.Load(datasourceID)

	if !exists {
		return nil, fmt.Errorf("no settings for datasource: %d", datasourceID)
	}

	client, exists := s.apiClients.Load(clientId)

	if exists {
		log.DefaultLogger.Info("Reusing BigQuery API client")
		if location != "" {
			client.(*api.API).SetLocation(location)
		} else {
			client.(*api.API).SetLocation(settings.(types.BigQuerySettings).ProcessingLocation)
		}
		return client.(*api.API), nil
	}

	httpClient, err := newHTTPClient(settings.(types.BigQuerySettings), httpclient.Options{})
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to crate http client")
	}

	client, err = bq.NewClient(ctx, project, option.WithHTTPClient(httpClient))

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to initialize BigQuery client")
	}

	apiInstance := api.New(client.(*bq.Client))

	if location != "" {
		apiInstance.SetLocation(location)
	} else {
		apiInstance.SetLocation(settings.(types.BigQuerySettings).ProcessingLocation)
	}

	s.apiClients.Store(clientId, apiInstance)

	return apiInstance, nil

}

func getDatasourceID(ctx context.Context) int64 {
	plugin := httpadapter.PluginConfigFromContext(ctx)
	return plugin.DataSourceInstanceSettings.ID
}

func parseConnectionArgs(queryArgs json.RawMessage) (*ConnectionArgs, error) {
	args := &ConnectionArgs{}
	if queryArgs != nil {
		err := json.Unmarshal(queryArgs, args)
		if err != nil {
			return nil, fmt.Errorf("error reading query params: %s", err.Error())
		}
	}
	return args, nil
}
