package types

import (
	"encoding/json"
	"strconv"
	"strings"
)

// LenientBool is a bool that also accepts the string and numeric spellings of a
// boolean, falling back to false rather than erroring on anything else.
//
// loadSettings unmarshals all of jsonData at once, so one property whose stored
// type does not match its struct field fails the unmarshal and the datasource
// with it. That makes a property declared only for parity with
// pkg/schema/dsconfig.json a hazard: it was ignored as an unknown field until
// declared, so a provisioned enableSecureSocksProxy: "true" used to be
// harmless - Grafana core reads that key with a swallowing type assertion
//
// LenientBool defines no MarshalJSON, so its Go kind still matches the schema
// valueType that the JSONDataTypesMatchStruct conformance test checks.
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
		}
		return nil
	}

	var number float64
	if err := json.Unmarshal(data, &number); err == nil {
		*b = LenientBool(number != 0)
	}

	return nil
}
