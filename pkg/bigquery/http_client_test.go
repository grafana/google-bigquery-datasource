package bigquery

import (
	"net/http"
	"testing"
	"time"

	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
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

	t.Run("returns error for forwardOAuthIdentity - no token provider middleware", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "forwardOAuthIdentity"

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.Nil(t, middleware)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "does not use a token provider middleware")
	})

	t.Run("returns error for workloadIdentityFederation - no token provider middleware", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "workloadIdentityFederation"

		middleware, err := getMiddleware(settings, bigQueryRoute)

		assert.Nil(t, middleware)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "does not use a token provider middleware")
	})
}

func TestNewHTTPClient(t *testing.T) {
	baseSettings := types.BigQuerySettings{
		DatasourceId:   1,
		Updated:        time.Now(),
		DefaultProject: "test-project",
		ClientEmail:    "test@example.com",
		PrivateKey:     "test-key",
		TokenUri:       "https://oauth2.googleapis.com/token",
	}

	newOpts := func() httpclient.Options {
		return httpclient.Options{Header: make(http.Header)}
	}

	t.Run("forwardOAuthIdentity with oauthPassThru enabled returns a client", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "forwardOAuthIdentity"
		settings.OAuthPassthroughEnabled = true

		client, err := newHTTPClient(settings, newOpts(), bigQueryRoute)

		require.NoError(t, err)
		assert.NotNil(t, client)
	})

	t.Run("workloadIdentityFederation with pool provider returns a client", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "workloadIdentityFederation"
		settings.WorkloadIdentityPoolProvider = "projects/123/locations/global/workloadIdentityPools/pool/providers/provider"

		client, err := newHTTPClient(settings, newOpts(), bigQueryRoute)

		require.NoError(t, err)
		assert.NotNil(t, client)
	})

	t.Run("workloadIdentityFederation without pool provider returns error", func(t *testing.T) {
		settings := baseSettings
		settings.AuthenticationType = "workloadIdentityFederation"
		settings.WorkloadIdentityPoolProvider = ""

		client, err := newHTTPClient(settings, newOpts(), bigQueryRoute)

		assert.Nil(t, client)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "workloadIdentityPoolProvider")
	})
}
