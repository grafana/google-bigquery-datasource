package driver

import (
	"context"
	"database/sql"
	"database/sql/driver"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
)

type Driver struct {
	connector *BigQueryConnector
	bqClient  *bq.Client
	settings  types.ConnectionSettings
}

func (d *Driver) Open(_ string) (c driver.Conn, err error) {
	return NewConnector(d.settings, d.bqClient).Connect(context.Background())
}

func (d *Driver) OpenConnector() (c *BigQueryConnector, err error) {
	return NewConnector(d.settings, d.bqClient), nil
}

// Closed reports whether the *sql.DB returned by Open has been closed.
func (d *Driver) Closed() bool {
	return d.connector == nil || d.connector.closed.Load()
}

// Open returns a *sql.DB backed by a single connector, which database/sql uses
// for every pooled connection and closes when the *sql.DB is closed.
func Open(settings types.ConnectionSettings, bqClient *bq.Client) (*Driver, *sql.DB, error) {
	d := &Driver{
		connector: NewConnector(settings, bqClient),
		bqClient:  bqClient,
		settings:  settings,
	}
	return d, sql.OpenDB(d.connector), nil
}
