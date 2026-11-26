package driver

import (
	"context"
	"database/sql"
	"sync"
	"testing"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDriverConcurrentOpen(t *testing.T) {
	d, db, err := Open(types.ConnectionSettings{}, &bq.Client{})
	require.NoError(t, err)

	const n = 20
	db.SetMaxIdleConns(n)
	start := make(chan struct{})
	conns := make([]*sql.Conn, n)
	var wg sync.WaitGroup
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			c, err := db.Conn(context.Background())
			if !assert.NoError(t, err) {
				return
			}
			conns[i] = c
			_ = d.Closed()
		}()
	}
	close(start)
	wg.Wait()
	for _, c := range conns {
		if c != nil {
			require.NoError(t, c.Close())
		}
	}
}

func TestDriverClosed(t *testing.T) {
	t.Run("open pool that never opened a connection is not closed", func(t *testing.T) {
		d, _, err := Open(types.ConnectionSettings{}, &bq.Client{})
		require.NoError(t, err)
		require.False(t, d.Closed())
	})

	t.Run("closing one driver connection does not close the pool", func(t *testing.T) {
		d, db, err := Open(types.ConnectionSettings{}, &bq.Client{})
		require.NoError(t, err)
		db.SetMaxIdleConns(0) // returned connections are closed immediately
		c, err := db.Conn(context.Background())
		require.NoError(t, err)
		require.NoError(t, c.Close())
		require.False(t, d.Closed())
	})

	t.Run("closing the pool closes the driver", func(t *testing.T) {
		d, db, err := Open(types.ConnectionSettings{}, &bq.Client{})
		require.NoError(t, err)
		c, err := db.Conn(context.Background())
		require.NoError(t, err)
		require.NoError(t, c.Close())
		require.NoError(t, db.Close())
		require.True(t, d.Closed())
	})
}
