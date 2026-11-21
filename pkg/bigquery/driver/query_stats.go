package driver

import (
	"context"
	"sync"
)

// QueryStat is the real cost a query consumed, read from the executed job's statistics (not a
// dry-run estimate), so the frontend can surface bytes billed/processed in the query inspector.
type QueryStat struct {
	BytesBilled    int64
	BytesProcessed int64
	CacheHit       bool
}

type statsSink struct {
	mu    sync.Mutex
	bySQL map[string]QueryStat
}

type statsKey struct{}

// WithQueryStats attaches a per-request sink to ctx. The driver records each executed query's
// stats into it keyed by the SQL it ran; the response mutator reads them back to annotate frames.
// Seeded once per QueryData request (see MutateQueryData).
func WithQueryStats(ctx context.Context) context.Context {
	return context.WithValue(ctx, statsKey{}, &statsSink{bySQL: map[string]QueryStat{}})
}

// RecordQueryStat stores stats for an executed query. No-op when no sink is present (health checks,
// resource calls, or callers that never seeded one), so it is always safe to call.
func RecordQueryStat(ctx context.Context, sql string, stat QueryStat) {
	sink, ok := ctx.Value(statsKey{}).(*statsSink)
	if !ok {
		return
	}
	sink.mu.Lock()
	sink.bySQL[sql] = stat
	sink.mu.Unlock()
}

// QueryStatForSQL returns the recorded stats for an executed SQL string — the same string sqlds
// records as a frame's ExecutedQueryString, which is how a frame is matched to its cost.
func QueryStatForSQL(ctx context.Context, sql string) (QueryStat, bool) {
	sink, ok := ctx.Value(statsKey{}).(*statsSink)
	if !ok {
		return QueryStat{}, false
	}
	sink.mu.Lock()
	defer sink.mu.Unlock()
	stat, ok := sink.bySQL[sql]
	return stat, ok
}
