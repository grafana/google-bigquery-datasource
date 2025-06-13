package utils

import (
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
	"golang.org/x/oauth2/jwt"
)

// JWTConfigFromDataSourceSettings creates a jwt.Config from datasource settings.
func JWTConfigFromDataSourceSettings(settings types.BigQuerySettings) *jwt.Config {
	conf := &jwt.Config{
		Email:      settings.ClientEmail,
		PrivateKey: []byte(settings.PrivateKey),
		Scopes: []string{
			"https://www.googleapis.com/auth/bigquery",
			"https://www.googleapis.com/auth/bigquery.insertdata",
			"https://www.googleapis.com/auth/cloud-platform",
			"https://www.googleapis.com/auth/cloud-platform.read-only",
			"https://www.googleapis.com/auth/devstorage.full_control",
			"https://www.googleapis.com/auth/devstorage.read_only",
			"https://www.googleapis.com/auth/devstorage.read_write",
			"https://www.googleapis.com/auth/drive",
		},
		TokenURL: settings.TokenUri,
	}
	return conf
}
