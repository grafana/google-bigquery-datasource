package bigquery

import (
	"testing"

	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
	"github.com/stretchr/testify/assert"
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
