package bigquery

import (
	"context"
	"testing"

	"github.com/grafana/google-bigquery-datasource/pkg/bigquery/driver"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/stretchr/testify/require"
)

func TestMutateResponseAttachesBytesToMatchingFrame(t *testing.T) {
	s := &BigQueryDatasource{}
	ctx := driver.WithQueryStats(context.Background())
	driver.RecordQueryStat(ctx, "SELECT 1", driver.QueryStat{BytesBilled: 1048576, BytesProcessed: 2048})

	frame := data.NewFrame("A")
	frame.Meta = &data.FrameMeta{ExecutedQueryString: "SELECT 1"}

	out, err := s.MutateResponse(ctx, data.Frames{frame})
	require.NoError(t, err)
	require.Len(t, out[0].Meta.Stats, 2)
	require.Equal(t, "Bytes billed", out[0].Meta.Stats[0].DisplayName)
	require.Equal(t, float64(1048576), out[0].Meta.Stats[0].Value)
	require.Equal(t, "Bytes processed", out[0].Meta.Stats[1].DisplayName)
	require.Equal(t, float64(2048), out[0].Meta.Stats[1].Value)
}

func TestMutateResponseLeavesUnmatchedFramesUnchanged(t *testing.T) {
	s := &BigQueryDatasource{}
	ctx := driver.WithQueryStats(context.Background())

	frame := data.NewFrame("A")
	frame.Meta = &data.FrameMeta{ExecutedQueryString: "SELECT unrecorded"}

	out, err := s.MutateResponse(ctx, data.Frames{frame})
	require.NoError(t, err)
	require.Empty(t, out[0].Meta.Stats)
}
