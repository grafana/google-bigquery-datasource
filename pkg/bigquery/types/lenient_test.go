package types

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLenientBool(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want LenientBool
	}{
		{name: "true", raw: `true`, want: true},
		{name: "false", raw: `false`, want: false},
		{name: "quoted true", raw: `"true"`, want: true},
		{name: "quoted true capitalised", raw: `"True"`, want: true},
		{name: "quoted false", raw: `"false"`, want: false},
		{name: "quoted one", raw: `"1"`, want: true},
		{name: "quoted zero", raw: `"0"`, want: false},
		{name: "quoted with whitespace", raw: `" true "`, want: true},
		{name: "number one", raw: `1`, want: true},
		{name: "number zero", raw: `0`, want: false},
		{name: "unparseable string", raw: `"yes please"`, want: false},
		{name: "object", raw: `{"on":true}`, want: false},
		{name: "array", raw: `[true]`, want: false},
		{name: "null", raw: `null`, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var value LenientBool
			require.NoError(t, json.Unmarshal([]byte(tt.raw), &value))
			assert.Equal(t, tt.want, value)
		})
	}
}
