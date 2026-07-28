package bigquery

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/gtime"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/grafana/macropro"
	"github.com/grafana/sqlds/v5"
)

// contextFrom builds a macropro QueryContext from a sqlds Query.
func contextFrom(q *sqlutil.Query) macropro.QueryContext[struct{}] {
	return macropro.QueryContext[struct{}]{
		TimeRange: macropro.TimeRange{
			From: q.TimeRange.From,
			To:   q.TimeRange.To,
		},
		Interval:   q.Interval,
		IntervalMS: q.Interval.Milliseconds(),
		Table:      q.Table,
		Column:     q.Column,
	}
}

func macroColumn(_ macropro.QueryContext[struct{}], _ []string) (string, error) {
	return "", errors.New("$__column macro is not supported")
}

func macroTable(_ macropro.QueryContext[struct{}], _ []string) (string, error) {
	return "", errors.New("$__table macro is not supported")
}

// macroInterval overrides macropro's default with gtime formatting, which
// renders day/week/year units (1d, 2w, 1y) the way sqlutil.DefaultMacros did;
// macropro's own default stops at hours.
func macroInterval(ctx macropro.QueryContext[struct{}], _ []string) (string, error) {
	return gtime.FormatInterval(ctx.Interval), nil
}

// macroTimeFrom renders the start of the dashboard time range. With no
// arguments it returns the documented BigQuery value form (a TIMESTAMP
// constructor); with a column argument it returns the lower-bound filter the
// legacy sqlutil pipeline produced, so existing dashboards keep working.
//
//	$__timeFrom()     → TIMESTAMP('2006-01-02T15:04:05Z')
//	$__timeFrom(time) → time >= '2006-01-02T15:04:05Z'
func macroTimeFrom(ctx macropro.QueryContext[struct{}], args []string) (string, error) {
	return timeBoundary("$__timeFrom", ">=", ctx.TimeRange.From, args)
}

// macroTimeTo is the upper-bound counterpart to macroTimeFrom.
//
//	$__timeTo()     → TIMESTAMP('2006-01-02T15:04:05Z')
//	$__timeTo(time) → time <= '2006-01-02T15:04:05Z'
func macroTimeTo(ctx macropro.QueryContext[struct{}], args []string) (string, error) {
	return timeBoundary("$__timeTo", "<=", ctx.TimeRange.To, args)
}

// timeBoundary implements the dual-mode behavior shared by macroTimeFrom and
// macroTimeTo. A single empty argument is treated like no argument at all, so
// $__timeFrom() and bare $__timeFrom both yield the value form.
func timeBoundary(name, op string, t time.Time, args []string) (string, error) {
	ts := t.UTC().Format(time.RFC3339)
	switch {
	case len(args) == 0 || (len(args) == 1 && args[0] == ""):
		return fmt.Sprintf("TIMESTAMP('%s')", ts), nil
	case len(args) == 1:
		return fmt.Sprintf("%s %s '%s'", args[0], op, ts), nil
	default:
		return "", fmt.Errorf("%w: %s accepts at most 1 argument (column name), received %d", sqlutil.ErrorBadArgumentCount, name, len(args))
	}
}

func macroTimeGroup(_ macropro.QueryContext[struct{}], args []string) (string, error) {
	if len(args) < 2 {
		return "", fmt.Errorf("%w: expected 2 arguments, received %d", errors.New("macro $__timeGroup needs time column and interval"), len(args))
	}

	if args[0] == "" {
		return "", fmt.Errorf("the first parameter(time column) for $__timeGroup macro cannot be empty")
	}

	if args[1] == "" {
		return "", fmt.Errorf("the second parameter(interval) for $__timeGroup macro cannot be empty")
	}

	timeVar := args[0]
	intervalVar := strings.Trim(args[1], "'\"")
	if intervalVar == "" {
		return "", fmt.Errorf("the second parameter(interval) for $__timeGroup macro cannot be empty")
	}

	// Month intervals need calendar-aware grouping because a month is not a fixed
	// number of milliseconds. The trailing "M" denotes months, e.g. "1M", "3M".
	if strings.HasSuffix(intervalVar, "M") {
		months := 1
		if prefix := strings.TrimSpace(strings.TrimSuffix(intervalVar, "M")); prefix != "" {
			n, err := strconv.Atoi(prefix)
			if err != nil || n < 1 {
				return "", fmt.Errorf("error parsing interval %v", intervalVar)
			}
			months = n
		}

		if months == 1 {
			// Bucket to the first day of each calendar month.
			return fmt.Sprintf("TIMESTAMP((PARSE_DATE(\"%%Y-%%m-%%d\",CONCAT( CAST((EXTRACT(YEAR FROM %s)) AS STRING),'-',CAST((EXTRACT(MONTH FROM %s)) AS STRING),'-','01'))))", timeVar, timeVar), nil
		}

		// Bucket into N-month windows aligned to the start of the calendar year
		// (e.g. 3M -> Jan/Apr/Jul/Oct).
		return fmt.Sprintf("TIMESTAMP(DATE(EXTRACT(YEAR FROM %s), CAST(FLOOR((EXTRACT(MONTH FROM %s) - 1) / %d) * %d + 1 AS INT64), 1))", timeVar, timeVar, months, months), nil
	}

	interval, err := gtime.ParseInterval(intervalVar)

	if err != nil {
		return "", fmt.Errorf("error parsing interval %v", intervalVar)

	}

	return fmt.Sprintf("TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(%s), %v) * %v)", timeVar, interval.Milliseconds(), interval.Milliseconds()), nil
}

// macros is the complete macro set for the BigQuery datasource. It layers
// BigQuery-specific handlers on top of macropro's dialect-neutral defaults.
// The defaults kept as-is (interval_ms, timeFilter) already match the output
// of the sqlutil.DefaultMacros pipeline this replaced; the overrides either
// diverge from macropro's defaults for compatibility (interval), render
// BigQuery dialect forms (timeFrom, timeTo), implement BigQuery SQL
// (timeGroup), or reject macros the plugin has never supported (table,
// column).
var macros = macropro.MergeMacros(macropro.DefaultMacros[struct{}](), macropro.MacroMap[struct{}]{
	"column":    macroColumn,
	"table":     macroTable,
	"interval":  macroInterval,
	"timeFrom":  macroTimeFrom,
	"timeTo":    macroTimeTo,
	"timeGroup": macroTimeGroup,
})

// bigQueryComments is the comment/quote style macropro uses when stripping
// comments before macro expansion. GoogleSQL recognizes #, -- and /* */
// comments, backslash escapes inside string literals (e.g. 'it\'s') and
// backtick-quoted identifiers (e.g. `project.dataset.table`), so those
// regions must not be mis-lexed as comments or macro tokens.
const bigQueryComments = macropro.LineComment | macropro.BlockComment | macropro.HashComment | macropro.BackslashEscape | macropro.BacktickQuote

// interpolate expands all $__ macros in the query using macropro's parsing
// engine. Unknown macros are left unchanged; a handler error returns the
// original query and the error.
func interpolate(q *sqlutil.Query) (string, error) {
	return macropro.Interpolate(q.RawSQL, macros, contextFrom(q), macropro.WithComments(bigQueryComments))
}

// interpolateMacros is the sqlds.Interpolator installed by NewDatasource. It
// replaces sqlds's default sqlutil.Interpolate pipeline with macropro, so
// macropro owns macro parsing end-to-end.
//
// Every error is wrapped as a downstream error: interpolation failures
// originate from the user's query text (bad macro arguments, unsupported
// macros, parse errors), never from a plugin bug. sqlds only
// downstream-classifies bad-argument-count and bracket errors on its own, so
// without this wrap the rest would be miscounted as plugin errors.
func interpolateMacros(_ context.Context, query *sqlutil.Query, _ json.RawMessage) (string, error) {
	sql, err := interpolate(query)
	if err != nil {
		return "", backend.DownstreamError(err)
	}
	return sql, nil
}

// Macros returns an empty macro map. BigQuery macros are expanded by the
// macropro-backed sqlds.Interpolator installed in NewDatasource, which
// replaces sqlds's sqlutil.Interpolate pipeline entirely, so this map is
// never consulted on the query path. macropro.DefaultMacros is already
// merged into the macros map above, so nothing is lost by leaving it empty.
func (s *BigQueryDatasource) Macros() sqlds.Macros {
	return sqlds.Macros{}
}
