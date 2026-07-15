package bigquery

import (
	"testing"

	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
	"github.com/stretchr/testify/assert"
)

func TestGetConnectionSettings(t *testing.T) {
	t.Run("propagates query priority from datasource settings", func(t *testing.T) {
		settings := types.BigQuerySettings{
			DefaultProject:     "my-project",
			ProcessingLocation: "US",
			QueryPriority:      "BATCH",
			MaxBytesBilled:     1234,
		}

		cs := getConnectionSettings(settings, &ConnectionArgs{}, false)

		assert.Equal(t, "BATCH", cs.QueryPriority)
		assert.Equal(t, "my-project", cs.Project)
		assert.Equal(t, "US", cs.Location)
		assert.Equal(t, int64(1234), cs.MaxBytesBilled)
	})

	t.Run("leaves query priority empty when unset", func(t *testing.T) {
		cs := getConnectionSettings(types.BigQuerySettings{}, &ConnectionArgs{}, false)
		assert.Equal(t, "", cs.QueryPriority)
	})

	t.Run("query args override location but keep query priority", func(t *testing.T) {
		settings := types.BigQuerySettings{
			ProcessingLocation: "US",
			QueryPriority:      "INTERACTIVE",
		}

		cs := getConnectionSettings(settings, &ConnectionArgs{Location: "EU"}, true)

		assert.Equal(t, "EU", cs.Location)
		assert.Equal(t, "INTERACTIVE", cs.QueryPriority)
	})
}
