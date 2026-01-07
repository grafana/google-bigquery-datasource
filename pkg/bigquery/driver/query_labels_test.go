package driver

import (
	"reflect"
	"testing"

	"cloud.google.com/go/bigquery"
	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
)

func TestHeadersAsLabels(t *testing.T) {
	tests := []struct {
		name    string
		headers map[string][]string
		want    map[string]string
	}{
		{
			"keeps wanted headers",
			map[string][]string{
				HeaderPluginID:      {"test_plugin_ID"},
				HeaderDatasourceUID: {"test_datasource_UID"},
				HeaderDashboardUID:  {"test_dashboard_UID"},
			},
			map[string]string{
				"x-plugin-id":      "test_plugin_id",
				"x-datasource-uid": "test_datasource_uid",
				"x-dashboard-uid":  "test_dashboard_uid",
			},
		},
		{
			"ignores unwanted headers",
			map[string][]string{
				HeaderPluginID:      {"test-PluGin-Id"},
				"X-Unwanted-Header": {"unwanted-Value"},
				HeaderDashboardUID:  {"Test_Dashboard_Uid"},
			},
			map[string]string{
				"x-plugin-id":     "test-plugin-id",
				"x-dashboard-uid": "test_dashboard_uid",
			},
		},
		{
			"returns empty when no wanted headers",
			map[string][]string{
				"Header1": {"val1"},
				"Header2": {"val2"},
			},
			map[string]string{},
		},
		{
			"invalid characters in value",
			map[string][]string{
				HeaderPluginID:     {"teS%t-pl&ugin-ID"},      //cspell:disable-line
				HeaderDashboardUID: {"Test_Da^^@shboard_Uid"}, //cspell:disable-line
			},
			map[string]string{
				"x-plugin-id":     "test-plugin-id",
				"x-dashboard-uid": "test_dashboard_uid",
			},
		},
		{
			"duplicate separators are reduced to one",
			map[string][]string{
				HeaderPluginID:      {"test--plugin-ID"},
				HeaderDashboardUID:  {"Test__Dashboard_Uid"},
				HeaderPanelID:       {"test-_panel-id"},
				HeaderPanelPluginId: {"test_-panel-plugin-id"},
				HeaderQueryGroupID:  {"test--query--group-----id"},
				HeaderDatasourceUID: {"---test-datasource-uid"},
			},
			map[string]string{
				"x-plugin-id":       "test-plugin-id",
				"x-dashboard-uid":   "test_dashboard_uid",
				"x-panel-id":        "test_panel-id",
				"x-panel-plugin-id": "test-panel-plugin-id",
				"x-query-group-id":  "test-query-group-id",
				"x-datasource-uid":  "-test-datasource-uid",
			},
		},
		{
			"numbers are valid values",
			map[string][]string{
				HeaderPluginID:     {"1"},
				HeaderDashboardUID: {"09"},
			},
			map[string]string{
				"x-plugin-id":     "1",
				"x-dashboard-uid": "09",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			conn := &Conn{
				cfg: &types.ConnectionSettings{
					Headers: tt.headers,
				},
				client: &bigquery.Client{},
			}
			if got := conn.headersAsLabels(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Conn.headersAsLabels() = %v, want %v", got, tt.want)
			}
		})
	}
}
