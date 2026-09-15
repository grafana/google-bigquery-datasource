package types

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

// maxLoggedValueLen keeps a stored object or array from filling a log line.
const maxLoggedValueLen = 64

// coerced and dropped record a jsonData value that did not match its declared
// type. "coerced" means the value could still be read after converting it;
// "dropped" means it could not, so the field is left at its zero value.
//
// This plugin has no metrics instrumentation yet, unlike
// github.com/grafana/grafana-prometheus-datasource's equivalent (see
// pkg/promlib/models/lenient.go and pkg/promlib/instrumentation there), so
// only a warning is logged.
func coerced(toValueType, fromValueType string, data []byte) {
	logLenient(fromValueType, toValueType, "coerced", data)
}

func dropped(toValueType, fromValueType string, data []byte) {
	logLenient(fromValueType, toValueType, "dropped", data)
}

func logLenient(fromValueType, toValueType, outcome string, data []byte) {
	value := string(data)
	if len(value) > maxLoggedValueLen {
		value = value[:maxLoggedValueLen] + "…"
	}
	log.DefaultLogger.Warn("datasource jsonData value does not match its declared type",
		"from", fromValueType, "to", toValueType, "outcome", outcome, "value", value)
}

// LenientBool is a bool that also accepts the string and numeric spellings of a
// boolean, falling back to false rather than erroring on anything else.
type LenientBool bool

func (b *LenientBool) UnmarshalJSON(data []byte) error {
	var value bool
	if err := json.Unmarshal(data, &value); err == nil {
		*b = LenientBool(value)
		return nil
	}

	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		if parsed, err := strconv.ParseBool(strings.TrimSpace(str)); err == nil {
			*b = LenientBool(parsed)
			coerced("bool", "string", data)
			return nil
		}
		dropped("bool", "string", data)
		return nil
	}

	var number float64
	if err := json.Unmarshal(data, &number); err == nil {
		*b = LenientBool(number != 0)
		coerced("bool", "float64", data)
		return nil
	}

	dropped("bool", "unknown", data)
	return nil
}
