package bigquery

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/api"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/experimental/datasourcetest"
	"github.com/grafana/sqlds/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/cloudresourcemanager/v3"
	"google.golang.org/api/option"
	"google.golang.org/grpc/metadata"
)

func RunConnection(ds *BigQueryDatasource, connectionArgs json.RawMessage) (*sql.DB, error) {
	return ds.Connect(context.Background(), backend.DataSourceInstanceSettings{
		ID: 1,
		DecryptedSecureJSONData: map[string]string{
			"privateKey": "randomPrivateKey",
		},
		JSONData: []byte(`{"authenticationType":"jwt","defaultProject": "raintank-dev","tokenUri":"token","clientEmail":"test@grafana.com"}`),
	}, connectionArgs)
}
func Test_datasourceConnection(t *testing.T) {
	ds := &BigQueryDatasource{
		bqFactory: func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error) {
			return &bq.Client{
				Location: "test",
			}, nil
		},
		resourceManagerServices: make(map[string]*cloudresourcemanager.Service),
	}

	t.Run("errors if authentication details are not configured connection", func(t *testing.T) {
		db, err := ds.Connect(context.Background(), backend.DataSourceInstanceSettings{
			ID:       1,
			JSONData: []byte(`{"authenticationType":"jwt"}`),
		}, []byte("{}"))

		assert.Nil(t, db)
		assert.Errorf(t, err, "datasource is missing authentication details")
	})

	t.Run("default connection", func(t *testing.T) {
		_, err := RunConnection(ds, []byte("{}"))
		assert.Nil(t, err)

		_, exists := ds.connections.Load("1/:raintank-dev")
		assert.True(t, exists)
	})

	t.Run("connection from connection args", func(t *testing.T) {
		_, err1 := RunConnection(ds, []byte(`{"location": "us-west2"}`))
		assert.Nil(t, err1)

		_, exists := ds.connections.Load("1/us-west2:raintank-dev")
		assert.True(t, exists)
	})

	t.Run("creates multiple connections for different connection args", func(t *testing.T) {
		_, err1 := RunConnection(ds, []byte(`{"location": "us-west2"}`))
		assert.Nil(t, err1)

		_, err2 := RunConnection(ds, []byte(`{"location": "us-west3"}`))
		assert.Nil(t, err2)

		_, conn1Exists := ds.connections.Load("1/us-west2:raintank-dev")
		assert.True(t, conn1Exists)
		_, conn2Exists := ds.connections.Load("1/us-west3:raintank-dev")
		assert.True(t, conn2Exists)
	})

	t.Run("reuses existing BigQuery client if API exists for given connection details ", func(t *testing.T) {
		clientsFactoryCallsCount := 0

		ds := &BigQueryDatasource{
			bqFactory: func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error) {
				clientsFactoryCallsCount += 1
				return &bq.Client{
					Location: "test",
				}, nil
			},
			resourceManagerServices: make(map[string]*cloudresourcemanager.Service),
		}

		ds.apiClients.Store("1/us-west2:raintank-dev", api.New(&bq.Client{
			Location: "us-west1",
		}))

		_, err1 := RunConnection(ds, []byte(`{"location": "us-west2"}`))
		assert.Nil(t, err1)

		_, exists := ds.connections.Load("1/us-west2:raintank-dev")
		assert.True(t, exists)
		assert.Equal(t, 0, clientsFactoryCallsCount)
	})

	t.Run("creates BigQuery client if API does not exists for given connection details ", func(t *testing.T) {
		clientsFactoryCallsCount := 0

		ds := &BigQueryDatasource{
			bqFactory: func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error) {
				clientsFactoryCallsCount += 1
				return &bq.Client{
					Location: "test",
				}, nil
			},
			resourceManagerServices: make(map[string]*cloudresourcemanager.Service),
		}

		ds.apiClients.Store("1/us-west2:raintank-dev", api.New(&bq.Client{
			Location: "",
		}))

		_, err1 := RunConnection(ds, []byte(`{}`))
		assert.Nil(t, err1)

		_, exists := ds.connections.Load("1/:raintank-dev")
		assert.True(t, exists)

		_, apiClient1Exists := ds.apiClients.Load("1/us-west2:raintank-dev")
		assert.True(t, apiClient1Exists)
		_, apiClient2Exists := ds.apiClients.Load("1/:raintank-dev")
		assert.True(t, apiClient2Exists)

		assert.Equal(t, 1, clientsFactoryCallsCount)
	})

	t.Run("creates resource manager if doesn't exist for the given datasource", func(t *testing.T) {
		ds := &BigQueryDatasource{
			bqFactory: func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error) {
				return &bq.Client{
					Location: "test",
				}, nil
			},
			resourceManagerServices: make(map[string]*cloudresourcemanager.Service),
		}

		_, err1 := RunConnection(ds, []byte(`{}`))
		assert.Nil(t, err1)

		_, exists := ds.resourceManagerServices["1"]
		assert.True(t, exists)
	})
}

func Test_getApi(t *testing.T) {
	origPluginConfigFromContext := PluginConfigFromContext
	defer func() { PluginConfigFromContext = origPluginConfigFromContext }()

	PluginConfigFromContext = func(ctx context.Context) backend.PluginContext {
		return backend.PluginContext{
			DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
				ID: 1,
				DecryptedSecureJSONData: map[string]string{
					"privateKey": "randomPrivateKey",
				},
				JSONData: []byte(`{"authenticationType":"jwt","defaultProject": "raintank-dev", "processingLocation": "us-west1","tokenUri":"token","clientEmail":"test@grafana.com"}`),
			},
		}
	}

	t.Run("returns api client for given connection details", func(t *testing.T) {
		ds := &BigQueryDatasource{
			bqFactory: func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error) {
				return &bq.Client{
					Location: "test",
				}, nil
			},
		}
		_, err := ds.getApi(context.Background(), "raintank-dev", "us-west1")
		assert.Nil(t, err)

		_, apiConnExists := ds.apiClients.Load("1/us-west1:raintank-dev")
		assert.True(t, apiConnExists)
	})

	t.Run("creates api clients for unique connection details", func(t *testing.T) {
		clientsFactoryCallsCount := 0

		ds := &BigQueryDatasource{
			bqFactory: func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error) {
				clientsFactoryCallsCount += 1
				return &bq.Client{
					Location: "test",
				}, nil
			},
		}
		_, err1 := ds.getApi(context.Background(), "raintank-dev", "us-west1")
		assert.Nil(t, err1)
		_, apiConn1Exists := ds.apiClients.Load("1/us-west1:raintank-dev")
		assert.True(t, apiConn1Exists)

		_, err2 := ds.getApi(context.Background(), "raintank-prod", "us-west2")
		assert.Nil(t, err2)
		_, apiConn2Exists := ds.apiClients.Load("1/us-west2:raintank-prod")
		assert.True(t, apiConn2Exists)

		assert.Equal(t, clientsFactoryCallsCount, 2)
	})

	t.Run("returns existing api client if exists for given connection details", func(t *testing.T) {
		clientsFactoryCallsCount := 0

		ds := &BigQueryDatasource{
			bqFactory: func(ctx context.Context, projectID string, opts ...option.ClientOption) (*bq.Client, error) {
				clientsFactoryCallsCount += 1
				return &bq.Client{
					Location: "test",
				}, nil
			},
		}

		ds.apiClients.Store("1/us-west1:raintank-dev", api.New(&bq.Client{
			Location: "us-west1",
		}))

		_, err := ds.getApi(context.Background(), "raintank-dev", "us-west1")
		assert.Nil(t, err)
		assert.Equal(t, clientsFactoryCallsCount, 0)
	})

}

func TestBigQueryMultiTenancy(t *testing.T) {
	const (
		tenantID1 = "abc123"
		tenantID2 = "def456"
		addr      = "127.0.0.1:8000"
	)

	var instances []sqlds.Completable
	factoryInvocations := 0
	factory := datasource.InstanceFactoryFunc(func(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
		factoryInvocations++
		i, err := NewDatasource(ctx, settings)
		if c, ok := i.(sqlds.Completable); ok {
			instances = append(instances, c)
		}
		return i, err
	})

	tp, err := datasourcetest.Manage(factory, datasourcetest.ManageOpts{Address: addr})
	require.NoError(t, err)
	defer func() {
		if err = tp.Shutdown(); err != nil {
			t.Log("plugin shutdown error", err)
		}
	}()

	pCtx := backend.PluginContext{DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
		ID: 1,
		DecryptedSecureJSONData: map[string]string{
			"privateKey": "randomPrivateKey",
		},
		JSONData: []byte(`{"authenticationType":"jwt","defaultProject": "raintank-dev", "processingLocation": "us-west1","tokenUri":"token","clientEmail":"test@grafana.com"}`),
	}}

	t.Run("Request without tenant information creates an instance", func(t *testing.T) {
		qdr := &backend.QueryDataRequest{PluginContext: pCtx}
		crr := &backend.CallResourceRequest{PluginContext: pCtx}
		responseSender := newTestCallResourceResponseSender()
		ctx := context.Background()

		resp, err := tp.Client.QueryData(ctx, qdr)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.Equal(t, 1, factoryInvocations)

		err = tp.Client.CallResource(ctx, crr, responseSender)
		require.NoError(t, err)
		require.Equal(t, 1, factoryInvocations)

		t.Run("Request from tenant #1 creates new instance", func(t *testing.T) {
			ctx = metadata.AppendToOutgoingContext(context.Background(), "tenantID", tenantID1)
			resp, err = tp.Client.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 2, factoryInvocations)

			// subsequent requests from tenantID1 with same settings will reuse instance
			resp, err = tp.Client.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 2, factoryInvocations)

			err = tp.Client.CallResource(ctx, crr, responseSender)
			require.NoError(t, err)

			t.Run("Request from tenant #2 creates new instance", func(t *testing.T) {
				ctx = metadata.AppendToOutgoingContext(context.Background(), "tenantID", tenantID2)
				resp, err = tp.Client.QueryData(ctx, qdr)
				require.NoError(t, err)
				require.NotNil(t, resp)
				require.Equal(t, 3, factoryInvocations)

				// subsequent requests from tenantID2 with same settings will reuse instance
				err = tp.Client.CallResource(ctx, crr, responseSender)
				require.NoError(t, err)
				require.Equal(t, 3, factoryInvocations)
			})

			// subsequent requests from tenantID1 with same settings will reuse instance
			ctx = metadata.AppendToOutgoingContext(context.Background(), "tenantID", tenantID1)
			resp, err = tp.Client.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 3, factoryInvocations)

			err = tp.Client.CallResource(ctx, crr, responseSender)
			require.NoError(t, err)
			require.Equal(t, 3, factoryInvocations)
		})
	})

	require.Len(t, instances, 3)
	require.NotEqual(t, instances[0], instances[1])
	require.NotEqual(t, instances[0], instances[2])
	require.NotEqual(t, instances[1], instances[2])
}

type testCallResourceResponseSender struct{}

func newTestCallResourceResponseSender() *testCallResourceResponseSender {
	return &testCallResourceResponseSender{}
}

func (s *testCallResourceResponseSender) Send(_ *backend.CallResourceResponse) error {
	return nil
}
