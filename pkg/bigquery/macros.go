package bigquery

import (
	"errors"
	"fmt"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/gtime"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/grafana/sqlds/v5"
)

func macroColumn(query *sqlutil.Query, args []string) (string, error) {
	return "", errors.New("$__column macro is not supported")
}

func macroTable(query *sqlutil.Query, args []string) (string, error) {
	return "", errors.New("$__table macro is not supported")
}

func macroTimeGroup(query *sqlutil.Query, args []string) (string, error) {
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
	last := intervalVar[len(intervalVar)-1:]

	// when month interval
	if last == "M" {
		return fmt.Sprintf("TIMESTAMP((PARSE_DATE(\"%%Y-%%m-%%d\",CONCAT( CAST((EXTRACT(YEAR FROM %s)) AS STRING),'-',CAST((EXTRACT(MONTH FROM %s)) AS STRING),'-','01'))))", timeVar, timeVar), nil
	}

	interval, err := gtime.ParseInterval(intervalVar)

	if err != nil {
		return "", fmt.Errorf("error parsing interval %v", intervalVar)

	}

	return fmt.Sprintf("TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(%s), %v) * %v)", timeVar, interval.Milliseconds(), interval.Milliseconds()), nil
}

var macros = map[string]sqlds.MacroFunc{
	"column":    macroColumn,
	"table":     macroTable,
	"timeGroup": macroTimeGroup,
}

func (s *BigQueryDatasource) Macros() sqlds.Macros {
	return macros
}
