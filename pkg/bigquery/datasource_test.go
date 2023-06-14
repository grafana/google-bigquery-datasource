package bigquery

import (
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"testing"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	pluginV2 "github.com/grafana/grafana-plugin-sdk-go/genproto/pluginv2"
	"github.com/grafana/sqlds/v2"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/cloudresourcemanager/v3"
	"google.golang.org/api/option"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/api"
)

func RunConnection(ds *BigQueryDatasource, connectionArgs json.RawMessage) (*sql.DB, error) {
	return ds.Connect(backend.DataSourceInstanceSettings{
		ID: 1,
		DecryptedSecureJSONData: map[string]string{
			"privateKey": "randomPrivateKey",
		},
		JSONData: []byte(`{"authenticationType":"jwt","defaultProject": "raintank-dev", "processingLocation": "us-west1","tokenUri":"token","clientEmail":"test@grafana.com"}`),
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
		db, err := ds.Connect(backend.DataSourceInstanceSettings{
			ID:       1,
			JSONData: []byte(`{"authenticationType":"jwt"}`),
		}, []byte("{}"))

		assert.Nil(t, db)
		assert.Errorf(t, err, "datasource is missing authentication details")
	})

	t.Run("default connection", func(t *testing.T) {
		_, err := RunConnection(ds, []byte("{}"))
		assert.Nil(t, err)

		_, exists := ds.connections.Load("1/us-west1:raintank-dev")
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
			Location: "us-west1",
		}))

		_, err1 := RunConnection(ds, []byte(`{}`))
		assert.Nil(t, err1)

		_, exists := ds.connections.Load("1/us-west1:raintank-dev")
		assert.True(t, exists)

		_, apiClient1Exists := ds.apiClients.Load("1/us-west2:raintank-dev")
		assert.True(t, apiClient1Exists)
		_, apiClient2Exists := ds.apiClients.Load("1/us-west1:raintank-dev")
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
	factory := datasource.InstanceFactoryFunc(func(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
		factoryInvocations++
		i, err := NewDatasource(settings)
		if c, ok := i.(sqlds.Completable); ok {
			instances = append(instances, c)
		}
		return i, err
	})

	instanceProvider := datasource.NewInstanceProvider(factory)
	instanceMgr := instancemgmt.New(instanceProvider)

	go func() {
		err := backend.StandaloneServe(backend.ServeOpts{
			QueryDataHandler: backend.QueryDataHandlerFunc(
				func(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
					h, err := instanceMgr.Get(ctx, req.PluginContext)
					if err != nil {
						return nil, err
					}
					if ds, ok := h.(backend.QueryDataHandler); ok {
						return ds.QueryData(ctx, req)
					}
					return nil, status.Error(codes.Unimplemented, "unimplemented")
				}),
			CallResourceHandler: backend.CallResourceHandlerFunc(
				func(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
					h, err := instanceMgr.Get(ctx, req.PluginContext)
					if err != nil {
						return err
					}
					if ds, ok := h.(backend.CallResourceHandler); ok {
						return ds.CallResource(ctx, req, sender)
					}
					return status.Error(codes.Unimplemented, "unimplemented")
				}),
			CheckHealthHandler: backend.CheckHealthHandlerFunc(
				func(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
					h, err := instanceMgr.Get(ctx, req.PluginContext)
					if err != nil {
						return nil, err
					}
					if ds, ok := h.(backend.CheckHealthHandler); ok {
						return ds.CheckHealth(ctx, req)
					}
					return nil, status.Error(codes.Unimplemented, "unimplemented")
				}),
		}, addr)
		require.NoError(t, err)
	}()

	// TODO when plugin SDK is updated
	//t.Setenv("GF_PLUGIN_GRPC_ADDRESS_BIGQUERY_DATASOURCE", addr)
	//t.Setenv("GF_PLUGIN_GRPC_STANDALONE_BIGQUERY_DATASOURCE", "true")
	//
	//go func() {
	//	err := datasource.Manage("bigquery-datasource", factory, datasource.ManageOpts{})
	//	require.NoError(t, err)
	//}()

	pc, shutdown, err := newPluginClient(addr)
	require.NoError(t, err)
	defer func() {
		err = shutdown()
		require.NoError(t, err)
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
		chr := &backend.CheckHealthRequest{PluginContext: pCtx}
		responseSender := newTestCallResourceResponseSender()
		ctx := context.Background()

		resp, err := pc.QueryData(ctx, qdr)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.Equal(t, 1, factoryInvocations)

		err = pc.CallResource(ctx, crr, responseSender)
		require.NoError(t, err)
		require.Equal(t, 1, factoryInvocations)

		t.Run("Request from tenant #1 creates new instance", func(t *testing.T) {
			ctx = metadata.AppendToOutgoingContext(context.Background(), "tenantID", tenantID1)
			resp, err = pc.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 2, factoryInvocations)

			// subsequent requests from tenantID1 with same settings will reuse instance
			resp, err = pc.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 2, factoryInvocations)

			var chRes *backend.CheckHealthResult
			chRes, err = pc.CheckHealth(ctx, chr)
			require.NoError(t, err)
			require.NotNil(t, chRes)
			require.Equal(t, 2, factoryInvocations)

			t.Run("Request from tenant #2 creates new instance", func(t *testing.T) {
				ctx = metadata.AppendToOutgoingContext(context.Background(), "tenantID", tenantID2)
				resp, err = pc.QueryData(ctx, qdr)
				require.NoError(t, err)
				require.NotNil(t, resp)
				require.Equal(t, 3, factoryInvocations)

				// subsequent requests from tenantID2 with same settings will reuse instance
				err = pc.CallResource(ctx, crr, responseSender)
				require.NoError(t, err)
				require.Equal(t, 3, factoryInvocations)
			})

			// subsequent requests from tenantID1 with same settings will reuse instance
			ctx = metadata.AppendToOutgoingContext(context.Background(), "tenantID", tenantID1)
			resp, err = pc.QueryData(ctx, qdr)
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, 3, factoryInvocations)

			chRes, err = pc.CheckHealth(ctx, chr)
			require.NoError(t, err)
			require.NotNil(t, chRes)
			require.Equal(t, 3, factoryInvocations)
		})
	})

	require.Len(t, instances, 3)
	require.NotEqual(t, instances[0], instances[1])
	require.NotEqual(t, instances[0], instances[2])
	require.NotEqual(t, instances[1], instances[2])
}

func newPluginClient(addr string) (*testPluginClient, shutdownFunc, error) {
	c, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithBlock())
	if err != nil {
		return nil, noShutdown, err
	}

	plugin := &testPluginClient{
		diagnosticsClient: pluginV2.NewDiagnosticsClient(c),
		dataClient:        pluginV2.NewDataClient(c),
		resourceClient:    pluginV2.NewResourceClient(c),
	}

	return plugin, func() error {
		return c.Close()
	}, nil
}

type testPluginClient struct {
	dataClient        pluginV2.DataClient
	diagnosticsClient pluginV2.DiagnosticsClient
	resourceClient    pluginV2.ResourceClient
}

type shutdownFunc func() error

var noShutdown = shutdownFunc(func() error {
	return nil
})

func (p *testPluginClient) QueryData(ctx context.Context, r *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	req := backend.ToProto().QueryDataRequest(r)

	resp, err := p.dataClient.QueryData(ctx, req)
	if err != nil {
		return nil, err
	}

	return backend.FromProto().QueryDataResponse(resp)
}

func (p *testPluginClient) CheckHealth(ctx context.Context, r *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	req := &pluginV2.CheckHealthRequest{
		PluginContext: backend.ToProto().PluginContext(r.PluginContext),
	}

	resp, err := p.diagnosticsClient.CheckHealth(ctx, req)
	if err != nil {
		return nil, err
	}

	return backend.FromProto().CheckHealthResponse(resp), nil
}

func (p *testPluginClient) CallResource(ctx context.Context, r *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	protoReq := backend.ToProto().CallResourceRequest(r)
	protoStream, err := p.resourceClient.CallResource(ctx, protoReq)
	if err != nil {
		if status.Code(err) == codes.Unimplemented {
			return errors.New("method not implemented")
		}

		return err
	}

	for {
		protoResp, err := protoStream.Recv()
		if err != nil {
			if status.Code(err) == codes.Unimplemented {
				return errors.New("method not implemented")
			}

			if errors.Is(err, io.EOF) {
				return nil
			}

			return err
		}

		if err = sender.Send(backend.FromProto().CallResourceResponse(protoResp)); err != nil {
			return err
		}
	}
}

type testCallResourceResponseSender struct{}

func newTestCallResourceResponseSender() *testCallResourceResponseSender {
	return &testCallResourceResponseSender{}
}

func (s *testCallResourceResponseSender) Send(_ *backend.CallResourceResponse) error {
	return nil
}
