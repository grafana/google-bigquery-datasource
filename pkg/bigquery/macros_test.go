package bigquery

import (
	"strings"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
)

func testQuery(rawSQL string) *sqlutil.Query {
	return &sqlutil.Query{
		RawSQL: rawSQL,
		TimeRange: backend.TimeRange{
			From: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			To:   time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC),
		},
		Interval: 5 * time.Minute,
	}
}

func Test_interpolate(t *testing.T) {
	tests := []struct {
		description string
		rawSQL      string
		expected    string
	}{
		{
			"time groups 1w",
			"SELECT $__timeGroup(created_at, 1w) FROM t",
			"SELECT TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(created_at), 604800000) * 604800000) FROM t",
		},
		{
			"time groups 1d",
			"SELECT $__timeGroup(created_at, 1d) FROM t",
			"SELECT TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(created_at), 86400000) * 86400000) FROM t",
		},
		{
			"time groups 1M",
			"SELECT $__timeGroup(created_at, 1M) FROM t",
			"SELECT TIMESTAMP((PARSE_DATE(\"%Y-%m-%d\",CONCAT( CAST((EXTRACT(YEAR FROM created_at)) AS STRING),'-',CAST((EXTRACT(MONTH FROM created_at)) AS STRING),'-','01')))) FROM t",
		},
		{
			"time groups '1M'",
			"SELECT $__timeGroup(created_at, '1M') FROM t",
			"SELECT TIMESTAMP((PARSE_DATE(\"%Y-%m-%d\",CONCAT( CAST((EXTRACT(YEAR FROM created_at)) AS STRING),'-',CAST((EXTRACT(MONTH FROM created_at)) AS STRING),'-','01')))) FROM t",
		},
		{
			"time groups \"1M\"",
			"SELECT $__timeGroup(created_at, \"1M\") FROM t",
			"SELECT TIMESTAMP((PARSE_DATE(\"%Y-%m-%d\",CONCAT( CAST((EXTRACT(YEAR FROM created_at)) AS STRING),'-',CAST((EXTRACT(MONTH FROM created_at)) AS STRING),'-','01')))) FROM t",
		},
		{
			"time groups 3M (quarterly)",
			"SELECT $__timeGroup(created_at, 3M) FROM t",
			"SELECT TIMESTAMP(DATE(EXTRACT(YEAR FROM created_at), CAST(FLOOR((EXTRACT(MONTH FROM created_at) - 1) / 3) * 3 + 1 AS INT64), 1)) FROM t",
		},
		{
			"time groups 6M",
			"SELECT $__timeGroup(created_at, 6M) FROM t",
			"SELECT TIMESTAMP(DATE(EXTRACT(YEAR FROM created_at), CAST(FLOOR((EXTRACT(MONTH FROM created_at) - 1) / 6) * 6 + 1 AS INT64), 1)) FROM t",
		},
		{
			"time groups 12M (yearly)",
			"SELECT $__timeGroup(created_at, 12M) FROM t",
			"SELECT TIMESTAMP(DATE(EXTRACT(YEAR FROM created_at), CAST(FLOOR((EXTRACT(MONTH FROM created_at) - 1) / 12) * 12 + 1 AS INT64), 1)) FROM t",
		},
		{
			"time filter",
			"SELECT * FROM t WHERE $__timeFilter(created_at)",
			"SELECT * FROM t WHERE created_at >= '2023-01-01T00:00:00Z' AND created_at <= '2023-01-02T00:00:00Z'",
		},
		{
			"time from filter form",
			"SELECT * FROM t WHERE $__timeFrom(created_at)",
			"SELECT * FROM t WHERE created_at >= '2023-01-01T00:00:00Z'",
		},
		{
			"time to filter form",
			"SELECT * FROM t WHERE $__timeTo(created_at)",
			"SELECT * FROM t WHERE created_at <= '2023-01-02T00:00:00Z'",
		},
		{
			"time from value form",
			"SELECT $__timeFrom() AS period_start FROM t",
			"SELECT TIMESTAMP('2023-01-01T00:00:00Z') AS period_start FROM t",
		},
		{
			"time from value form as a bare token",
			"SELECT $__timeFrom AS period_start FROM t",
			"SELECT TIMESTAMP('2023-01-01T00:00:00Z') AS period_start FROM t",
		},
		{
			"time to value form",
			"SELECT $__timeTo() AS period_end FROM t",
			"SELECT TIMESTAMP('2023-01-02T00:00:00Z') AS period_end FROM t",
		},
		{
			"time boundaries in a BETWEEN range",
			"SELECT * FROM t WHERE ts BETWEEN $__timeFrom() AND $__timeTo()",
			"SELECT * FROM t WHERE ts BETWEEN TIMESTAMP('2023-01-01T00:00:00Z') AND TIMESTAMP('2023-01-02T00:00:00Z')",
		},
		{
			"interval",
			"SELECT '$__interval' FROM t",
			"SELECT '5m' FROM t",
		},
		{
			"interval_ms",
			"SELECT $__interval_ms FROM t",
			"SELECT 300000 FROM t",
		},
		{
			"unknown macros are left unchanged",
			"SELECT $__unknown(created_at) FROM t",
			"SELECT $__unknown(created_at) FROM t",
		},
		{
			"macro inside a -- comment is not expanded",
			"SELECT 1 FROM t -- $__timeFilter(created_at)",
			"SELECT 1 FROM t " + strings.Repeat(" ", len("-- $__timeFilter(created_at)")),
		},
		{
			"macro inside a # comment is not expanded",
			"SELECT 1 FROM t # $__timeFilter(created_at)",
			"SELECT 1 FROM t " + strings.Repeat(" ", len("# $__timeFilter(created_at)")),
		},
		{
			"macro inside a block comment is not expanded",
			"SELECT 1 /* $__timeFilter(created_at) */ FROM t",
			"SELECT 1 " + strings.Repeat(" ", len("/* $__timeFilter(created_at) */")) + " FROM t",
		},
		{
			"hash inside a backtick-quoted identifier is not a comment",
			"SELECT `claim #1`, $__timeFrom(created_at) FROM t",
			"SELECT `claim #1`, created_at >= '2023-01-01T00:00:00Z' FROM t",
		},
		{
			"comment marker inside a backslash-escaped string is not a comment",
			"SELECT 'O\\'Brien -- so', $__timeFrom(created_at) FROM t",
			"SELECT 'O\\'Brien -- so', created_at >= '2023-01-01T00:00:00Z' FROM t",
		},
	}
	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			res, err := interpolate(testQuery(tt.rawSQL))
			if err != nil {
				t.Fatalf("unexpected error %v", err)
			}
			if res != tt.expected {
				t.Errorf("unexpected result %q, expecting %q", res, tt.expected)
			}
		})
	}
}

func Test_interpolate_errors(t *testing.T) {
	tests := []struct {
		description string
		rawSQL      string
		errContains string
	}{
		{
			"column macro is not supported",
			"SELECT $__column FROM t",
			"$__column macro is not supported",
		},
		{
			"table macro is not supported",
			"SELECT * FROM $__table",
			"$__table macro is not supported",
		},
		{
			"time group with missing interval",
			"SELECT $__timeGroup(created_at) FROM t",
			"macro $__timeGroup needs time column and interval",
		},
		{
			"time group with invalid interval",
			"SELECT $__timeGroup(created_at, banana) FROM t",
			"error parsing interval banana",
		},
		{
			"time from with too many arguments",
			"SELECT * FROM t WHERE $__timeFrom(a, b)",
			"$__timeFrom accepts at most 1 argument",
		},
	}
	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			_, err := interpolate(testQuery(tt.rawSQL))
			if err == nil {
				t.Fatalf("expected an error containing %q, got none", tt.errContains)
			}
			if !strings.Contains(err.Error(), tt.errContains) {
				t.Errorf("unexpected error %q, expecting it to contain %q", err, tt.errContains)
			}
		})
	}
}

// An interval that is empty once its surrounding quote characters are
// stripped must return an error rather than panicking with a
// slice-bounds-out-of-range.
func Test_macroTimeGroup_emptyIntervalReturnsError(t *testing.T) {
	for _, interval := range []string{"", "''", "\"\""} {
		t.Run("interval="+interval, func(t *testing.T) {
			res, err := interpolate(testQuery("SELECT $__timeGroup(created_at, " + interval + ") FROM t"))
			if err == nil {
				t.Errorf("expected an error for empty interval %q, got result %q", interval, res)
			}
		})
	}
}
