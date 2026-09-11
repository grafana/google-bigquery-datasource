package bigquery

import (
	"testing"

	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseAllowedDatasets(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want []string
	}{
		{name: "empty string", raw: "", want: nil},
		{name: "single entry", raw: "mydataset", want: []string{"mydataset"}},
		{name: "qualified entry", raw: "myproject.mydataset", want: []string{"myproject.mydataset"}},
		{
			name: "multiple entries with whitespace and empty items",
			raw:  " sales , other-project.analytics ,, ",
			want: []string{"sales", "other-project.analytics"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, parseAllowedDatasets(tt.raw))
		})
	}
}

// enableSecureSocksProxy used to be an unknown field that json.Unmarshal
// skipped, so a datasource provisioned with a quoted value loaded fine.
// Declaring it turned that into a fatal unmarshal error until it was made
// lenient. types.LenientBool covers the coercion itself; this covers the
// end-to-end path that the regression actually broke.
func TestLoadSettingsToleratesQuotedSecureSocksProxy(t *testing.T) {
	settings, err := loadSettings(&backend.DataSourceInstanceSettings{
		JSONData: []byte(`{"defaultProject":"myproject","enableSecureSocksProxy":"true"}`),
	})

	require.NoError(t, err)
	assert.Equal(t, types.LenientBool(true), settings.EnableSecureSocksProxy)
	assert.Equal(t, "myproject", settings.DefaultProject)
}

func TestGetConnectionSettingsDatasetRestriction(t *testing.T) {
	settings := types.BigQuerySettings{
		DefaultProject:               "myproject",
		RestrictToAccessibleDatasets: true,
		AdditionalAllowedDatasets:    "sales, other-project.analytics",
	}

	connectionSettings := getConnectionSettings(settings, &ConnectionArgs{}, false)

	assert.True(t, connectionSettings.RestrictToAccessibleDatasets)
	assert.Equal(t, []string{"sales", "other-project.analytics"}, connectionSettings.AdditionalAllowedDatasets)
}
