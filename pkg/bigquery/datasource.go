package bigquery

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"sync"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-google-sdk-go/pkg/utils"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/proxy"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/grafana/sqlds/v2"
	"github.com/pkg/errors"
	"google.golang.org/api/cloudresourcemanager/v3"
	"google.golang.org/api/option"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/api"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/driver"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
)

var PluginConfigFromContext = httpadapter.PluginConfigFromContext

type BigqueryDatasourceIface interface {
	sqlds.Driver
	Datasets(ctx context.Context, args DatasetsArgs) ([]string, error)
	TableSchema(ctx context.Context, args TableSchemaArgs) (*types.TableMetadataResponse, error)
	ValidateQuery(ctx context.Context, args ValidateQueryArgs) (*api.ValidateQueryResponse, error)
	Projects(options ProjectsArgs) ([]*cloudresourcemanager.Project, error)
}

type conn struct {
	db     *sql.DB
	driver *driver.Driver
}

type mapKey struct {
	connectionKey string
	secureProxy   bool
}

type bqServiceFactory func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error)

type BigQueryDatasource struct {
	connections             sync.Map
	apiClients              sync.Map
	bqFactory               bqServiceFactory
	resourceManagerServices map[string]*cloudresourcemanager.Service
}

type ConnectionArgs struct {
	Dataset  string `json:"dataset,omitempty"`
	Table    string `json:"table,omitempty"`
	Location string `json:"location,omitempty"`
}

func NewDatasource(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	s := newBigQueryDatasource()
	ds := sqlds.NewDatasource(s)
	ds.Completable = s
	ds.EnableMultipleConnections = true
	ds.CustomRoutes = newResourceHandler(s).Routes()

	return ds.NewDatasource(settings)
}

func newBigQueryDatasource() *BigQueryDatasource {
	return &BigQueryDatasource{
		bqFactory:               bq.NewClient,
		resourceManagerServices: make(map[string]*cloudresourcemanager.Service),
	}
}

func (s *BigQueryDatasource) Connect(config backend.DataSourceInstanceSettings, queryArgs json.RawMessage) (*sql.DB, error) {
	log.DefaultLogger.Debug("Connecting to BigQuery")

	settings, err := loadSettings(&config)
	if err != nil {
		return nil, err
	}

	args, err := parseConnectionArgs(queryArgs)
	if err != nil {
		return nil, err
	}

	connectionSettings := getConnectionSettings(settings, args)

	if settings.AuthenticationType == "gce" && connectionSettings.Project == "" {
		defaultProject, err := utils.GCEDefaultProject(context.Background(), BigQueryScope)
		if err != nil {
			return nil, errors.WithMessage(err, "Failed to retrieve default GCE project")
		}
		connectionSettings.Project = defaultProject
	}

	connectionKey := fmt.Sprintf("%d/%s:%s", config.ID, connectionSettings.Location, connectionSettings.Project)

	if s.resourceManagerServices[fmt.Sprint(config.ID)] == nil {
		err := createResourceManagerService(config, settings, fmt.Sprint(config.ID), s)
		if err != nil {
			return nil, err
		}
	}

	opts, err := config.HTTPClientOptions()
	if err != nil {
		return nil, err
	}

	key := mapKey{connectionKey: connectionKey, secureProxy: proxy.SecureSocksProxyEnabled(opts.ProxyOptions)}
	c, exists := s.connections.Load(key)

	if exists {
		connection := c.(conn)
		if !connection.driver.Closed() {
			log.DefaultLogger.Debug("Reusing existing connection to BigQuery")
			return connection.db, nil
		}
	} else {
		log.DefaultLogger.Debug("Creating new connection to BigQuery")
	}

	aC, exists := s.apiClients.Load(key)

	// If we have already instantiated API client for given connection details then reuse it's underlying big query
	// client for db connection.
	if exists {
		dr, db, err := driver.Open(connectionSettings, aC.(*api.API).Client)
		if err != nil {
			return nil, errors.WithMessage(err, "Failed to connect to database")
		}
		s.connections.Store(key, conn{db: db, driver: dr})
		return db, nil
	} else {
		httpOptions, err := config.HTTPClientOptions()
		if err != nil {
			return nil, err
		}

		client, err := newHTTPClient(settings, httpOptions, bigQueryRoute)
		if err != nil {
			return nil, errors.WithMessage(err, "Failed to create http client")
		}

		bqClient, err := s.bqFactory(context.Background(), connectionSettings.Project, option.WithHTTPClient(client))
		if err != nil {
			return nil, errors.WithMessage(err, "Failed to create BigQuery client")
		}

		dr, db, err := driver.Open(connectionSettings, bqClient)

		if err != nil {
			return nil, errors.WithMessage(err, "Failed to connect to database")
		}
		s.connections.Store(key, conn{db: db, driver: dr})

		apiInstance := api.New(bqClient)
		apiInstance.SetLocation(connectionSettings.Location)

		if err != nil {
			return nil, errors.WithMessage(err, "Failed to create BigQuery API client")
		}
		s.apiClients.Store(key, apiInstance)
		return db, nil
	}

}

func createResourceManagerService(config backend.DataSourceInstanceSettings, settings types.BigQuerySettings, id string, s *BigQueryDatasource) error {
	httpOptions, err := config.HTTPClientOptions()
	if err != nil {
		return err
	}

	httpClient, err := newHTTPClient(settings, httpOptions, resourceManagerRoute)
	if err != nil {
		return errors.WithMessage(err, "Failed to create http client for resource manager")
	}

	cloudresourcemanagerService, err := cloudresourcemanager.NewService(context.Background(), option.WithHTTPClient(httpClient))
	s.resourceManagerServices[id] = cloudresourcemanagerService
	if err != nil {
		return err
	}

	return nil
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

type DatasetsArgs struct {
	Project  string `json:"project"`
	Location string `json:"location"`
}

func (s *BigQueryDatasource) Datasets(ctx context.Context, options DatasetsArgs) ([]string, error) {
	apiClient, err := s.getApi(ctx, options.Project, options.Location)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	return apiClient.ListDatasets(ctx)
}

type TablesArgs struct {
	Project  string `json:"project"`
	Location string `json:"location"`
	Dataset  string `json:"dataset"`
}

// sqlds.Completable interface
func (s *BigQueryDatasource) Schemas(ctx context.Context, options sqlds.Options) ([]string, error) {
	return nil, nil
}

// sqlds.Completable interface
func (s *BigQueryDatasource) Tables(ctx context.Context, options sqlds.Options) ([]string, error) {
	args := TablesArgs{
		Project:  options["project"],
		Dataset:  options["dataset"],
		Location: options["location"],
	}

	if args.Project == "" || args.Dataset == "" || args.Location == "" {
		return nil, errors.New("project, dataset and location must be specified")
	}

	apiClient, err := s.getApi(ctx, args.Project, args.Location)

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	return apiClient.ListTables(ctx, args.Dataset)
}

// sqlds.Completable interface
func (s *BigQueryDatasource) Columns(ctx context.Context, options sqlds.Options) ([]string, error) {
	args := TableSchemaArgs{
		Project:  options["project"],
		Dataset:  options["dataset"],
		Table:    options["table"],
		Location: options["location"],
	}

	if args.Project == "" || args.Dataset == "" || args.Location == "" || args.Table == "" {
		return nil, errors.New("missing required arguments")
	}

	apiClient, err := s.getApi(ctx, args.Project, args.Location)

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	isOrderableString := options["isOrderable"]
	isOrderable, err := strconv.ParseBool(isOrderableString)

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to parse isOrderable")
	}

	return apiClient.ListColumns(ctx, args.Dataset, args.Table, isOrderable)
}

type ProjectsArgs struct {
	DatasourceID string `json:"datasourceId"`
}

func (s *BigQueryDatasource) Projects(options ProjectsArgs) ([]*cloudresourcemanager.Project, error) {
	response, err := s.resourceManagerServices[options.DatasourceID].Projects.Search().Do()

	if err != nil {
		return nil, err
	}

	return response.Projects, nil
}

type ValidateQueryArgs struct {
	Project   string            `json:"project"`
	Location  string            `json:"location"`
	Query     sqlds.Query       `json:"query"`
	TimeRange backend.TimeRange `json:"range"`
}

func (s *BigQueryDatasource) ValidateQuery(ctx context.Context, options ValidateQueryArgs) (*api.ValidateQueryResponse, error) {
	apiClient, err := s.getApi(ctx, options.Project, options.Location)

	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	query, err := sqlds.Interpolate(s, &options.Query)

	if err != nil {
		return &api.ValidateQueryResponse{
			IsValid: false,
			IsError: true,
			Error:   "Could not apply macros: " + err.Error(),
		}, nil
	}

	return apiClient.ValidateQuery(ctx, query), nil
}

type TableSchemaArgs struct {
	Project  string `json:"project"`
	Location string `json:"location"`
	Dataset  string `json:"dataset"`
	Table    string `json:"table"`
}

func (s *BigQueryDatasource) TableSchema(ctx context.Context, args TableSchemaArgs) (*types.TableMetadataResponse, error) {
	apiClient, err := s.getApi(ctx, args.Project, args.Location)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to retrieve BigQuery API client")
	}

	return apiClient.GetTableSchema(ctx, args.Dataset, args.Table)
}

func (s *BigQueryDatasource) getApi(ctx context.Context, project, location string) (*api.API, error) {
	datasourceSettings := getDatasourceSettings(ctx)

	opts, err := datasourceSettings.HTTPClientOptions()
	if err != nil {
		return nil, err
	}

	connectionKey := fmt.Sprintf("%d/%s:%s", datasourceSettings.ID, location, project)

	key := mapKey{connectionKey: connectionKey, secureProxy: proxy.SecureSocksProxyEnabled(opts.ProxyOptions)}
	cClient, exists := s.apiClients.Load(key)

	if exists {
		log.DefaultLogger.Debug("Reusing existing BigQuery API client")
		return cClient.(*api.API), nil
	}

	settings, err := loadSettings(datasourceSettings)
	if err != nil {
		return nil, err
	}

	httpOptions, err := datasourceSettings.HTTPClientOptions()
	if err != nil {
		return nil, err
	}

	httpClient, err := newHTTPClient(settings, httpOptions, bigQueryRoute)
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to crate http client")
	}

	client, err := s.bqFactory(ctx, project, option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, errors.WithMessage(err, "Failed to initialize BigQuery client")
	}
	apiInstance := api.New(client)

	if location != "" {
		apiInstance.SetLocation(location)
	} else {
		apiInstance.SetLocation(settings.ProcessingLocation)
	}

	s.apiClients.Store(key, apiInstance)

	return apiInstance, nil

}

func getDatasourceSettings(ctx context.Context) *backend.DataSourceInstanceSettings {
	plugin := PluginConfigFromContext(ctx)
	return plugin.DataSourceInstanceSettings
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
