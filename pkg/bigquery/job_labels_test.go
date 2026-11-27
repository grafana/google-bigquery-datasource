package bigquery

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/sqlds/v5"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/cloudresourcemanager/v3"
	"google.golang.org/api/option"
)

type recordedJob struct {
	path   string
	query  string
	labels map[string]string
}

// fakeBigQuery records the query text and labels of every job request, then fails it.
type fakeBigQuery struct {
	mu   sync.Mutex
	jobs []recordedJob
}

func (f *fakeBigQuery) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	var req struct {
		// jobs.insert
		Configuration struct {
			Labels map[string]string `json:"labels"`
			Query  struct {
				Query string `json:"query"`
			} `json:"query"`
		} `json:"configuration"`
		// jobs.query
		Labels map[string]string `json:"labels"`
		Query  string            `json:"query"`
	}
	if r.Method == http.MethodPost && json.Unmarshal(body, &req) == nil {
		job := recordedJob{path: r.URL.Path, query: req.Configuration.Query.Query, labels: req.Configuration.Labels}
		if job.query == "" {
			job.query, job.labels = req.Query, req.Labels
		}
		f.mu.Lock()
		f.jobs = append(f.jobs, job)
		f.mu.Unlock()
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	_, _ = w.Write([]byte(`{"error":{"code":400,"message":"stop here"}}`))
}

func (f *fakeBigQuery) recorded() []recordedJob {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]recordedJob(nil), f.jobs...)
}

func newFakeBigQueryDatasource(t *testing.T) (*BigQueryDatasource, *fakeBigQuery) {
	t.Helper()
	fake := &fakeBigQuery{}
	srv := httptest.NewServer(fake)
	t.Cleanup(srv.Close)
	ds := &BigQueryDatasource{
		bqFactory: func(ctx context.Context, projectID string, _ ...option.ClientOption) (*bq.Client, error) {
			return bq.NewClient(ctx, projectID, option.WithEndpoint(srv.URL), option.WithoutAuthentication())
		},
		resourceManagerServices: make(map[string]*cloudresourcemanager.Service),
		logger:                  backend.NewLoggerWith("bigquery datasource"),
	}
	return ds, fake
}

// requestContext returns the context sqlds hands to the driver for a request carrying these headers.
func requestContext(ds *BigQueryDatasource, headers map[string]string) context.Context {
	ctx, _ := ds.MutateQueryData(context.Background(), &backend.QueryDataRequest{Headers: headers})
	return ctx
}

func dashboardHeader(uid string) map[string]string {
	return map[string]string{"http_X-Dashboard-Uid": uid}
}

func Test_jobLabelsFollowRequestHeaders(t *testing.T) {
	t.Run("query path uses the running request, not the one that opened the connection", func(t *testing.T) {
		ds, fake := newFakeBigQueryDatasource(t)

		var first *sql.DB
		for _, dash := range []string{"dash-a", "dash-b"} {
			db, err := RunConnection(ds, []byte(`{"location":"US","grafana-http-headers":{"X-Dashboard-Uid":["`+dash+`"]}}`))
			require.NoError(t, err)
			if first == nil {
				first = db
			}
			require.Same(t, first, db, "connection should be shared across header sets")
			rows, err := db.QueryContext(requestContext(ds, dashboardHeader(dash)), "SELECT 1")
			if err == nil {
				_ = rows.Close()
			}
		}
		rows, err := first.QueryContext(requestContext(ds, nil), "SELECT 1")
		if err == nil {
			_ = rows.Close()
		}

		jobs := fake.recorded()
		require.Len(t, jobs, 3)
		require.Equal(t, "dash-a", jobs[0].labels["x-dashboard-uid"])
		require.Equal(t, "dash-b", jobs[1].labels["x-dashboard-uid"])
		require.NotContains(t, jobs[2].labels, "x-dashboard-uid", "request without headers must not inherit another request's labels")
	})

	t.Run("exec path", func(t *testing.T) {
		ds, fake := newFakeBigQueryDatasource(t)
		db, err := RunConnection(ds, []byte(`{"location":"US","grafana-http-headers":{"X-Dashboard-Uid":["dash-a"]}}`))
		require.NoError(t, err)

		_, _ = db.ExecContext(requestContext(ds, dashboardHeader("dash-b")), "SELECT 1")

		jobs := fake.recorded()
		require.Len(t, jobs, 1)
		require.Equal(t, "dash-b", jobs[0].labels["x-dashboard-uid"], "path %s", jobs[0].path)
	})

	t.Run("concurrent queries on one shared connection keep their own labels", func(t *testing.T) {
		ds, fake := newFakeBigQueryDatasource(t)
		db, err := RunConnection(ds, []byte(`{"location":"US"}`))
		require.NoError(t, err)

		const n = 20
		var wg sync.WaitGroup
		for i := range n {
			wg.Add(1)
			go func() {
				defer wg.Done()
				dash := fmt.Sprintf("dash-%d", i)
				rows, err := db.QueryContext(requestContext(ds, dashboardHeader(dash)), "SELECT '"+dash+"'")
				if err == nil {
					_ = rows.Close()
				}
			}()
		}
		wg.Wait()

		jobs := fake.recorded()
		require.Len(t, jobs, n)
		for _, job := range jobs {
			require.Equal(t, "SELECT '"+job.labels["x-dashboard-uid"]+"'", job.query)
		}
	})

	t.Run("end to end through sqlds QueryData", func(t *testing.T) {
		s, fake := newFakeBigQueryDatasource(t)
		sqlDS := sqlds.NewDatasource(s)
		sqlDS.EnableMultipleConnections = true
		settings := backend.DataSourceInstanceSettings{
			ID:                      1,
			UID:                     "uid-1",
			DecryptedSecureJSONData: map[string]string{"privateKey": "randomPrivateKey"},
			JSONData:                []byte(`{"authenticationType":"jwt","defaultProject": "raintank-dev","tokenUri":"token","clientEmail":"test@grafana.com"}`),
		}
		inst, err := sqlDS.NewDatasource(context.Background(), settings)
		require.NoError(t, err)
		qd := inst.(*sqlds.SQLDatasource)

		pluginCtx := backend.PluginContext{Namespace: "org-3", DataSourceInstanceSettings: &settings}
		for _, dash := range []string{"dash-a", "dash-b"} {
			// The SDK middleware puts the plugin context on ctx before QueryData runs.
			_, err := qd.QueryData(backend.WithPluginContext(context.Background(), pluginCtx), &backend.QueryDataRequest{
				PluginContext: pluginCtx,
				Headers:       map[string]string{"http_X-Dashboard-Uid": dash, "http_X-Panel-Id": "7"},
				Queries: []backend.DataQuery{{
					RefID: "A",
					JSON:  []byte(`{"rawSql":"SELECT '` + dash + `'","format":1,"connectionArgs":{"location":"US"}}`),
				}},
			})
			require.NoError(t, err)
		}

		jobs := fake.recorded()
		require.Len(t, jobs, 2)
		for i, dash := range []string{"dash-a", "dash-b"} {
			require.Equal(t, "SELECT '"+dash+"'", jobs[i].query)
			require.Equal(t, dash, jobs[i].labels["x-dashboard-uid"])
			require.Equal(t, "7", jobs[i].labels["x-panel-id"])
			require.Equal(t, "org-3", jobs[i].labels["x-grafana-namespace"])
		}
	})
}
