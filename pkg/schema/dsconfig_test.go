package schema_test

import (
	_ "embed"
	"testing"

	"github.com/grafana/dsconfig/schema"
	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
)

//go:embed dsconfig.json
var configSchemaJSON []byte

//go:generate go test -run TestPlugin -generateArtifacts
func TestPlugin(t *testing.T) {
	schema.RunPluginTests(t, schema.PluginUnderTest{
		ID:                types.PluginID,
		ConfigSchemaJSON:  configSchemaJSON,
		SettingsJSONModel: types.BigQuerySettings{},
		SecureKeys:        []string{"privateKey"},
	})
}
