package driver

import (
	"context"
	"testing"
)

func TestQueryStatsSinkRecordsAndRetrievesBySQL(t *testing.T) {
	ctx := WithQueryStats(context.Background())
	RecordQueryStat(ctx, "SELECT 1", QueryStat{BytesBilled: 1048576, BytesProcessed: 2048})

	got, ok := QueryStatForSQL(ctx, "SELECT 1")
	if !ok {
		t.Fatal("expected a recorded stat for the executed SQL")
	}
	if got.BytesBilled != 1048576 || got.BytesProcessed != 2048 {
		t.Fatalf("unexpected stat: %+v", got)
	}
	if _, ok := QueryStatForSQL(ctx, "SELECT 2"); ok {
		t.Fatal("expected no stat for SQL that was never executed")
	}
}

func TestQueryStatsNoSinkIsSafe(t *testing.T) {
	// Health checks and resource calls never seed a sink: recording is a no-op, lookups miss.
	ctx := context.Background()
	RecordQueryStat(ctx, "SELECT 1", QueryStat{BytesBilled: 5})
	if _, ok := QueryStatForSQL(ctx, "SELECT 1"); ok {
		t.Fatal("expected no stat without a seeded sink")
	}
}
