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
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/grafana/sqlds/v4"
	"github.com/pkg/errors"
	"google.golang.org/api/cloudresourcemanager/v3"
	"google.golang.org/api/option"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/api"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/driver"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
	ut "github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/utils"
)

var (
	PluginConfigFromContext = backend.PluginConfigFromContext
	ErrFailedToConnect = backend.PluginError(errors.New("Failed to connect"))
)

type BigqueryDatasourceIface interface {
	sqlds.Driver
	Datasets(ctx context.Context, args DatasetsArgs) ([]string, error)
	TableSchema(ctx context.Context, args TableSchemaArgs) (*types.TableMetadataResponse, error)
	ValidateQuery(ctx context.Context, args ValidateQueryArgs) (*api.ValidateQueryResponse, error)
	Projects(ctx context.Context, options ProjectsArgs) ([]*Project, error)
}

type conn struct {
	db     *sql.DB
	driver *driver.Driver
}

type bqServiceFactory func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error)

type BigQueryDatasource struct {
	connections             sync.Map
	apiClients              sync.Map
	bqFactory               bqServiceFactory
	resourceManagerServices map[string]*cloudresourcemanager.Service
	logger                  log.Logger
}

type ConnectionArgs struct {
	Dataset          string              `json:"dataset,omitempty"`
	Table            string              `json:"table,omitempty"`
	Location         string              `json:"location,omitempty"`
	EnableStorageAPI bool                `json:"enableStorageAPI,omitempty"`
	Headers          map[string][]string `json:"grafana-http-headers,omitempty"`
}

func NewDatasource(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	s := newBigQueryDatasource()
	ds := sqlds.NewDatasource(s)
	ds.Completable = s
	ds.EnableMultipleConnections = true
	ds.CustomRoutes = newResourceHandler(s).Routes()

	return ds.NewDatasource(ctx, settings)
}

func newBigQueryDatasource() *BigQueryDatasource {
	return &BigQueryDatasource{
		bqFactory:               bq.NewClient,
		resourceManagerServices: make(map[string]*cloudresourcemanager.Service),
		logger:                  backend.Logger,
	}
}

func (s *BigQueryDatasource) Connect(ctx context.Context, config backend.DataSourceInstanceSettings, queryArgs json.RawMessage) (*sql.DB, error) {
	loggerWithContext := s.logger.FromContext(ctx)
	settings, err := loadSettings(&config)
	if err != nil {
		return nil, err
	}

	args, err := parseConnectionArgs(queryArgs)
	if err != nil {
		return nil, err
	}

	isQueryArgsSet := args != nil

	connectionSettings := getConnectionSettings(settings, args, isQueryArgsSet)

	if settings.AuthenticationType == "gce" && connectionSettings.Project == "" {
		defaultProject, err := utils.GCEDefaultProject(context.Background(), BigQueryScope)
		if err != nil {
			return nil, errors.WithMessage(err, "Failed to retrieve default GCE project")
		}
		connectionSettings.Project = defaultProject
	}

	connectionKey := fmt.Sprintf("%d/%s:%s:%t", config.ID, connectionSettings.Location, connectionSettings.Project, connectionSettings.EnableStorageAPI)

	if s.resourceManagerServices[fmt.Sprint(config.ID)] == nil {
		err := s.createResourceManagerService(ctx, config, settings, fmt.Sprint(config.ID))
		if err != nil {
			return nil, err
		}
	}

	opts, err := config.HTTPClientOptions(ctx)
	if err != nil {
		return nil, err
	}

	c, exists := s.connections.Load(connectionKey)

	if exists {
		connection := c.(conn)
		if !connection.driver.Closed() {
			loggerWithContext.Debug("Reusing existing connection to BigQuery")
			return connection.db, nil
		}
	} else {
		loggerWithContext.Debug("Creating new connection to BigQuery")
	}

	aC, exists := s.apiClients.Load(connectionKey)

	// If we have already instantiated API client for given connection details then reuse it's underlying big query
	// client for db connection.
	if exists {
		dr, db, err := driver.Open(connectionSettings, aC.(*api.API).Client)
		if err != nil {
			return nil, ErrFailedToConnect
		}
		s.connections.Store(connectionKey, conn{db: db, driver: dr})
		return db, nil
	} else {
		client, err := newHTTPClient(settings, opts, bigQueryRoute)
		if err != nil {
			loggerWithContext.Warn("Failed to get http client options", "error", err)
			return nil, err
		}

		options := []option.ClientOption{option.WithHTTPClient(client)}
		if settings.ServiceEndpoint != "" {
			loggerWithContext.Debug("Using custom service endpoint URL", "url", settings.ServiceEndpoint)
			options = append(options, option.WithEndpoint(settings.ServiceEndpoint))
		}

		bqClient, err := s.bqFactory(ctx, connectionSettings.Project, options...)
		if err != nil {
			loggerWithContext.Warn("Failed to create bigquery client", "error", err)
			return nil, ErrFailedToConnect
		}

		if connectionSettings.EnableStorageAPI {
			err = bqClient.EnableStorageReadClient(ctx, option.WithTokenSource(ut.JWTConfigFromDataSourceSettings(settings).TokenSource(ctx)))
			if err != nil {
				return nil, errors.WithMessage(err, "Failed to enable storage read client")
			}
		}

		dr, db, err := driver.Open(connectionSettings, bqClient)
		if err != nil {
			return nil, ErrFailedToConnect
		}
		
		s.connections.Store(connectionKey, conn{db: db, driver: dr})

		apiInstance := api.New(bqClient)
		apiInstance.SetLocation(connectionSettings.Location)

		s.apiClients.Store(connectionKey, apiInstance)
		return db, nil
	}

}

func (s *BigQueryDatasource) createResourceManagerService(ctx context.Context, config backend.DataSourceInstanceSettings, settings types.BigQuerySettings, id string) error {
	loggerWithContext := s.logger.FromContext(ctx)
	httpOptions, err := config.HTTPClientOptions(ctx)
	if err != nil {
		loggerWithContext.Warn("Failed to get http client options", "error", err)
		return err
	}

	httpClient, err := newHTTPClient(settings, httpOptions, resourceManagerRoute)
	if err != nil {
		loggerWithContext.Warn("Failed to create http client for resource manager", "error", err)
		return err
	}

	cloudresourcemanagerService, err := cloudresourcemanager.NewService(context.Background(), option.WithHTTPClient(httpClient))
	s.resourceManagerServices[id] = cloudresourcemanagerService
	if err != nil {
		loggerWithContext.Warn("Failed to create resource manager service", "error", err)
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

func (s *BigQueryDatasource) Settings(_ context.Context, _ backend.DataSourceInstanceSettings) sqlds.DriverSettings {
	return sqlds.DriverSettings{
		FillMode: &data.FillMissing{
			Mode: data.FillModeNull,
		},
		ForwardHeaders: true,
	}
}

type DatasetsArgs struct {
	Project  string `json:"project"`
	Location string `json:"location"`
}

func (s *BigQueryDatasource) Datasets(ctx context.Context, options DatasetsArgs) ([]string, error) {
	apiClient, err := s.getApi(ctx, options.Project, options.Location)
	if err != nil {
		return nil, err
	}

	return apiClient.ListDatasets(ctx)
}

// sqlds.Completable interface
func (s *BigQueryDatasource) Schemas(ctx context.Context, options sqlds.Options) ([]string, error) {
	return nil, nil
}

type TablesArgs struct {
	Project  string `json:"project"`
	Location string `json:"location"`
	Dataset  string `json:"dataset"`
}

// sqlds.Completable interface
func (s *BigQueryDatasource) Tables(ctx context.Context, options sqlds.Options) ([]string, error) {
	args := TablesArgs{
		Project:  options["project"],
		Dataset:  options["dataset"],
		Location: options["location"],
	}

	if args.Project == "" || args.Dataset == "" {
		return nil, errors.New("project and dataset must be specified")
	}

	apiClient, err := s.getApi(ctx, args.Project, args.Location)
	if err != nil {
		return nil, err
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

	if args.Project == "" || args.Dataset == "" || args.Table == "" {
		return nil, errors.New("missing required arguments")
	}

	apiClient, err := s.getApi(ctx, args.Project, args.Location)
	if err != nil {
		return nil, err
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

type Project struct {
	ProjectId   string `json:"projectId"`
	DisplayName string `json:"displayName"`
}

func (s *BigQueryDatasource) Projects(ctx context.Context, options ProjectsArgs) ([]*Project, error) {
	settings := getDatasourceSettings(ctx)
	bqSettings, err := loadSettings(settings)
	if err != nil {
		return nil, err
	}

	// If OAuth passthrough is enabled, return the default project
	if bqSettings.AuthenticationType == "forwardOAuthIdentity" {
		return []*Project{{ProjectId: bqSettings.DefaultProject, DisplayName: bqSettings.DefaultProject}}, nil
	}

	response, err := s.resourceManagerServices[options.DatasourceID].Projects.Search().Do()
	if err != nil {
		return nil, err
	}

	projects := make([]*Project, 0, len(response.Projects))
	for _, project := range response.Projects {
		projects = append(projects, &Project{project.ProjectId, project.DisplayName})
	}

	return projects, nil
}

type ValidateQueryArgs struct {
	Project   string            `json:"project"`
	Location  string            `json:"location"`
	Query     sqlutil.Query     `json:"query"`
	TimeRange backend.TimeRange `json:"range"`
}

func (s *BigQueryDatasource) ValidateQuery(ctx context.Context, options ValidateQueryArgs) (*api.ValidateQueryResponse, error) {
	apiClient, err := s.getApi(ctx, options.Project, options.Location)
	if err != nil {
		return nil, err
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
		return nil, err
	}

	return apiClient.GetTableSchema(ctx, args.Dataset, args.Table)
}

func (s *BigQueryDatasource) getApi(ctx context.Context, project, location string) (*api.API, error) {
	datasourceSettings := getDatasourceSettings(ctx)
	connectionKey := fmt.Sprintf("%d/%s:%s", datasourceSettings.ID, location, project)
	cClient, exists := s.apiClients.Load(connectionKey)

	if exists {
		s.logger.FromContext(ctx).Debug("Reusing existing BigQuery API client", "connectionKey", connectionKey)
		return cClient.(*api.API), nil
	}

	settings, err := loadSettings(datasourceSettings)
	if err != nil {
		return nil, err
	}

	httpOptions, err := datasourceSettings.HTTPClientOptions(ctx)
	if err != nil {
		return nil, err
	}

	httpClient, err := newHTTPClient(settings, httpOptions, bigQueryRoute)
	if err != nil {
		return nil, err
	}

	client, err := s.bqFactory(ctx, project, option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, err
	}
	apiInstance := api.New(client)

	apiInstance.SetLocation(location)

	s.apiClients.Store(connectionKey, apiInstance)

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
