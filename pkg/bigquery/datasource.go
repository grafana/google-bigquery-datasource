package bigquery

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"

	bq "cloud.google.com/go/bigquery"
	_ "github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/driver"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/grafana/sqlds/v2"
	"github.com/pkg/errors"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

type TableFieldSchema struct {
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Type        bq.FieldType `json:"type"`
	Schema      TableSchema  `json:"schema,omitempty"`
}

type TableSchema []*TableFieldSchema

type TableMetadataResponse struct {
	Schema TableSchema `json:"schema,omitempty"`
}

type BigqueryDatasourceIface interface {
	sqlds.Driver
	Datasets(ctx context.Context, project, location string) ([]string, error)
	Tables(ctx context.Context, project, location, dataset string) ([]string, error)
	TableSchema(ctx context.Context, project, location, dataset, table string) (*TableMetadataResponse, error)
}

type BigQueryDatasource struct {
	apiClients sync.Map
	config     sync.Map
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

	connectionString, err := getDSN(settings, args)

	if err != nil {
		return nil, err
	}

	db, err := sql.Open("bigquery", connectionString)

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to connect to database. Is the hostname and port correct?")
	}

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

func (s *BigQueryDatasource) Datasets(ctx context.Context, project, location string) ([]string, error) {
	apiClient, err := s.getApi(ctx, project)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	if location != "" {
		apiClient.Location = location
	}

	result := []string{}

	it := apiClient.Datasets(ctx)
	for {
		dataset, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		result = append(result, dataset.DatasetID)
	}

	return result, nil
}

func (s *BigQueryDatasource) Tables(ctx context.Context, project, location, dataset string) ([]string, error) {
	apiClient, err := s.getApi(ctx, project)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	if location != "" {
		apiClient.Location = location
	}
	datasetRef := apiClient.Dataset(dataset)

	result := []string{}

	it := datasetRef.Tables(ctx)
	for {
		table, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		result = append(result, table.TableID)
	}

	return result, nil
}

func (s *BigQueryDatasource) TableSchema(ctx context.Context, project, location, dataset, table string) (*TableMetadataResponse, error) {
	apiClient, err := s.getApi(ctx, project)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	if location != "" {
		apiClient.Location = location
	}

	tableMeta, err := apiClient.Dataset(dataset).Table(table).Metadata(ctx)
	if err != nil {
		return nil, errors.WithMessage(err, fmt.Sprintf("Failed to retrieve %s table metadata", table))
	}

	response, _ := json.Marshal(tableMeta)
	result := &TableMetadataResponse{}
	json.Unmarshal(response, result)

	return result, nil
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

func (s *BigQueryDatasource) getApi(ctx context.Context, project string) (*bq.Client, error) {
	datasourceID := getDatasourceID(ctx)
	clientId := fmt.Sprintf("%d/%s", datasourceID, project)

	c, exists := s.apiClients.Load(clientId)

	if exists {
		return c.(*bq.Client), nil
	}

	settings, exists := s.config.Load(datasourceID)

	if !exists {
		return nil, fmt.Errorf("no settings for datasource: %d", datasourceID)
	}

	log.DefaultLogger.Info("Creating new BigQuery API client", clientId)
	credentials := Credentials{
		Type:        "service_account",
		ClientEmail: settings.(Settings).ClientEmail,
		PrivateKey:  settings.(Settings).PrivateKey,
		TokenURI:    settings.(Settings).TokenUri,
		ProjectID:   project,
	}
	creds, err := json.Marshal(credentials)

	if err != nil {
		return nil, errors.WithMessage(err, "Invalid service account")
	}

	client, err := bq.NewClient(ctx, project, option.WithCredentialsJSON([]byte(creds)))

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to initialize BigQuery client")
	}

	s.apiClients.Store(clientId, client)
	return client, nil

}

func getDatasourceID(ctx context.Context) int64 {
	plugin := httpadapter.PluginConfigFromContext(ctx)
	return plugin.DataSourceInstanceSettings.ID
}
