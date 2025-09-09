package bigquery

import (
	"testing"
	"time"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetMiddleware(t *testing.T) {
	baseSettings := types.BigQuerySettings{
		DatasourceId:   1,
		Updated:        time.Now(),
		DefaultProject: "test-project",
		ClientEmail:    "test@example.com",
		PrivateKey:     "test-key",
		TokenUri:       "https://oauth2.googleapis.com/token",
	}

	t.Run("treats empty authentication type as jwt and validates datasource settings", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = ""

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.NotNil(t, middleware)
		assert.NoError(t, err)
	})

	t.Run("treats unsupported authentication type as jwt and validates datasource settings", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "unsupported-auth-type"

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.NotNil(t, middleware)
		assert.NoError(t, err)
	})

	t.Run("succeeds for valid gce authentication type", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "gce"

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.NotNil(t, middleware)
		assert.NoError(t, err)
	})

	t.Run("succeeds for valid jwt authentication type", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "jwt"

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.NotNil(t, middleware)
		assert.NoError(t, err)
	})

	t.Run("returns error when datasource settings are missing for jwt authentication", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "jwt"
		settings.ClientEmail = "" // Missing required field

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.Nil(t, middleware)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "datasource is missing authentication details")
	})

	t.Run("returns error when datasource settings are missing for empty authentication type", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = ""
		settings.DefaultProject = "" // Missing required field

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.Nil(t, middleware)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "datasource is missing authentication details")
	})

	t.Run("returns error when datasource settings are missing for unsupported authentication type", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "unsupported-type"
		settings.PrivateKey = "" // Missing required field

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.Nil(t, middleware)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "datasource is missing authentication details")
	})
}
