package bigquery

import (
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/pkg/errors"
)

func Test_macros(t *testing.T) {
	tests := []struct {
		description string
		macro       string
		query       *sqlutil.Query
		args        []string
		expected    string
		expectedErr error
	}{
		{
			"time groups 1w",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "1w"},
			"TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(created_at), 604800000) * 604800000)",
			nil,
		},
		{
			"time groups 1d",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "1d"},
			"TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(created_at), 86400000) * 86400000)",
			nil,
		},
		{
			"time groups 1M",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "1M"},
			"TIMESTAMP((PARSE_DATE(\"%Y-%m-%d\",CONCAT( CAST((EXTRACT(YEAR FROM created_at)) AS STRING),'-',CAST((EXTRACT(MONTH FROM created_at)) AS STRING),'-','01'))))",
			nil,
		},
		{
			"time groups '1M'",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "'1M'"},
			"TIMESTAMP((PARSE_DATE(\"%Y-%m-%d\",CONCAT( CAST((EXTRACT(YEAR FROM created_at)) AS STRING),'-',CAST((EXTRACT(MONTH FROM created_at)) AS STRING),'-','01'))))",
			nil,
		},
		{
			"time groups \"1M\"",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "\"1M\""},
			"TIMESTAMP((PARSE_DATE(\"%Y-%m-%d\",CONCAT( CAST((EXTRACT(YEAR FROM created_at)) AS STRING),'-',CAST((EXTRACT(MONTH FROM created_at)) AS STRING),'-','01'))))",
			nil,
		},
		{
			"time groups 3M (quarterly)",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "3M"},
			"TIMESTAMP(DATE(EXTRACT(YEAR FROM created_at), CAST(FLOOR((EXTRACT(MONTH FROM created_at) - 1) / 3) * 3 + 1 AS INT64), 1))",
			nil,
		},
		{
			"time groups 6M",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "6M"},
			"TIMESTAMP(DATE(EXTRACT(YEAR FROM created_at), CAST(FLOOR((EXTRACT(MONTH FROM created_at) - 1) / 6) * 6 + 1 AS INT64), 1))",
			nil,
		},
		{
			"time groups 12M (yearly)",
			"timeGroup",
			&sqlutil.Query{},
			[]string{"created_at", "12M"},
			"TIMESTAMP(DATE(EXTRACT(YEAR FROM created_at), CAST(FLOOR((EXTRACT(MONTH FROM created_at) - 1) / 12) * 12 + 1 AS INT64), 1))",
			nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			res, err := macros[tt.macro](tt.query, tt.args)
			if (err != nil || tt.expectedErr != nil) && !errors.Is(err, tt.expectedErr) {
				t.Errorf("unexpected error %v, expecting %v", err, tt.expectedErr)
			}
			if res != tt.expected {
				t.Errorf("unexpected result %v, expecting %v", res, tt.expected)
			}
		})
	}
}

// An interval that is empty after stripping quotes (e.g. "''") must return an
// error rather than panicking with a slice-bounds-out-of-range.
func Test_macroTimeGroup_emptyIntervalReturnsError(t *testing.T) {
	for _, interval := range []string{"", "''", "\"\""} {
		t.Run("interval="+interval, func(t *testing.T) {
			res, err := macros["timeGroup"](&sqlutil.Query{}, []string{"created_at", interval})
			if err == nil {
				t.Errorf("expected an error for empty interval %q, got result %q", interval, res)
			}
		})
	}
}
