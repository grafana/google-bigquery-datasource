package driver

import (
	"encoding/json"
	"fmt"
	"math/big"
	"testing"
	"time"

	"cloud.google.com/go/bigquery"
	"cloud.google.com/go/civil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func Test_ConvertColumnValue(t *testing.T) {
	bigRatFromString, _ := new(big.Rat).SetString("11.111111111")

	tests := []struct {
		name          string
		columnType    string
		schema        *bigquery.FieldSchema
		value         bigquery.Value
		expectedType  string
		expectedValue string
		Err           require.ErrorAssertionFunc
	}{
		{
			name:          "numeric type TINYINT",
			value:         bigquery.Value(int64(1.000)),
			columnType:    "TINYINT",
			schema:        &bigquery.FieldSchema{Type: "TINYINT"},
			expectedType:  "int64",
			expectedValue: "1",
		},
		{
			name:          "numeric type TINYINT repeated",
			value:         bigquery.Value([]bigquery.Value{int64(1.000), int64(2.000)}),
			columnType:    "TINYINT",
			schema:        &bigquery.FieldSchema{Type: "TINYINT", Repeated: true},
			expectedType:  "string",
			expectedValue: "1,2",
		},
		{
			name:          "numeric type SMALLINT",
			value:         bigquery.Value(int64(1.0)),
			columnType:    "TINYINT",
			schema:        &bigquery.FieldSchema{Type: "SMALLINT"},
			expectedType:  "int64",
			expectedValue: "1",
		},
		{
			name:          "numeric type SMALLINT repeated",
			value:         bigquery.Value([]bigquery.Value{int64(1.000), int64(2.000)}),
			columnType:    "TINYINT",
			schema:        &bigquery.FieldSchema{Type: "SMALLINT", Repeated: true},
			expectedType:  "string",
			expectedValue: "1,2",
		},
		{
			name:          "numeric type INT",
			value:         bigquery.Value(int64(1.000)),
			columnType:    "INT",
			schema:        &bigquery.FieldSchema{Type: "INT"},
			expectedType:  "int64",
			expectedValue: "1",
		},
		{
			name:          "numeric type INT repeated",
			value:         bigquery.Value([]bigquery.Value{int64(1.000), int64(2.000)}),
			columnType:    "INT",
			schema:        &bigquery.FieldSchema{Type: "INT", Repeated: true},
			expectedType:  "string",
			expectedValue: "1,2",
		},
		{
			name:          "numeric type INTEGER",
			value:         bigquery.Value(int64(1.000)),
			columnType:    "INT",
			schema:        &bigquery.FieldSchema{Type: "INTEGER"},
			expectedType:  "int64",
			expectedValue: "1",
		},
		{
			name:          "numeric type INTEGER repeated",
			value:         bigquery.Value([]bigquery.Value{int64(1.000), int64(2.000)}),
			columnType:    "INTEGER",
			schema:        &bigquery.FieldSchema{Type: "INTEGER", Repeated: true},
			expectedType:  "string",
			expectedValue: "1,2",
		},
		{
			name:          "numeric type INT64",
			value:         bigquery.Value(int64(1.00)),
			columnType:    "INT",
			schema:        &bigquery.FieldSchema{Type: "INT64"},
			expectedType:  "int64",
			expectedValue: "1",
		},
		{
			name:          "numeric type INT64 repeated",
			value:         bigquery.Value([]bigquery.Value{int64(1.000), int64(2.000)}),
			columnType:    "INT64",
			schema:        &bigquery.FieldSchema{Type: "INT64", Repeated: true},
			expectedType:  "string",
			expectedValue: "1,2",
		},
		{
			name:          "numeric type FLOAT",
			value:         bigquery.Value(float64(1.99999)),
			columnType:    "FLOAT",
			schema:        &bigquery.FieldSchema{Type: "FLOAT"},
			expectedType:  "float64",
			expectedValue: "1.99999",
		},
		{
			name:          "numeric type FLOAT repeated",
			value:         bigquery.Value([]bigquery.Value{float64(1.99999), float64(2.99999)}),
			columnType:    "FLOAT",
			schema:        &bigquery.FieldSchema{Type: "FLOAT", Repeated: true},
			expectedType:  "string",
			expectedValue: "1.99999,2.99999",
		},
		{
			name:          "numeric type FLOAT64",
			value:         bigquery.Value(float64(1.99999)),
			columnType:    "FLOAT64",
			schema:        &bigquery.FieldSchema{Type: "FLOAT64"},
			expectedType:  "float64",
			expectedValue: "1.99999",
		},
		{
			name:          "numeric type FLOAT64 repeated",
			value:         bigquery.Value([]bigquery.Value{float64(1.99999), float64(2.99999)}),
			columnType:    "FLOAT64",
			schema:        &bigquery.FieldSchema{Type: "FLOAT64", Repeated: true},
			expectedType:  "string",
			expectedValue: "1.99999,2.99999",
		},
		{
			name:          "numeric type NUMERIC",
			value:         bigquery.Value((&big.Rat{}).SetInt64(2)),
			columnType:    "NUMERIC",
			schema:        &bigquery.FieldSchema{Type: "NUMERIC"},
			expectedType:  "float64",
			expectedValue: "2",
		},
		{
			name:          "numeric type NUMERIC repeated",
			value:         bigquery.Value([]bigquery.Value{(&big.Rat{}).SetInt64(2), (&big.Rat{}).SetInt64(3)}),
			columnType:    "NUMERIC",
			schema:        &bigquery.FieldSchema{Type: "NUMERIC", Repeated: true},
			expectedType:  "string",
			expectedValue: "2,3",
		},
		{
			name:          "numeric type BIGNUMERIC",
			value:         bigquery.Value((&big.Rat{}).SetFloat64(2.34e+12)),
			columnType:    "BIGNUMERIC",
			schema:        &bigquery.FieldSchema{Type: "BIGNUMERIC"},
			expectedType:  "float64",
			expectedValue: "2.34e+12",
		},
		{
			name:          "numeric type BIGNUMERIC repeated",
			value:         bigquery.Value([]bigquery.Value{(&big.Rat{}).SetFloat64(2.34e+12), (&big.Rat{}).SetFloat64(3.34e+12)}),
			columnType:    "BIGNUMERIC",
			schema:        &bigquery.FieldSchema{Type: "BIGNUMERIC", Repeated: true},
			expectedType:  "string",
			expectedValue: "2.34e+12,3.34e+12",
		},
		{
			name:          "numeric type NUMERIC",
			value:         bigquery.Value((&big.Rat{}).SetFloat64(1.99999)),
			columnType:    "NUMERIC",
			schema:        &bigquery.FieldSchema{Type: "NUMERIC"},
			expectedType:  "float64",
			expectedValue: "1.99999",
		},
		{
			name:          "numeric type NUMERIC repeated",
			value:         bigquery.Value([]bigquery.Value{(&big.Rat{}).SetFloat64(1.99999), (&big.Rat{}).SetFloat64(2.99999)}),
			columnType:    "NUMERIC",
			schema:        &bigquery.FieldSchema{Type: "NUMERIC", Repeated: true},
			expectedType:  "string",
			expectedValue: "1.99999,2.99999",
		},
		{
			name:          "numeric type NUMERIC",
			value:         bigquery.Value(bigRatFromString),
			columnType:    "NUMERIC",
			schema:        &bigquery.FieldSchema{Type: "NUMERIC"},
			expectedType:  "float64",
			expectedValue: "11.111111111",
		},
		{
			name:          "numeric type NUMERIC repeated",
			value:         bigquery.Value([]bigquery.Value{bigRatFromString, bigRatFromString}),
			columnType:    "NUMERIC",
			schema:        &bigquery.FieldSchema{Type: "NUMERIC", Repeated: true},
			expectedType:  "string",
			expectedValue: "11.111111111,11.111111111",
		},
		{
			name:          "DATE",
			value:         bigquery.Value(civil.Date{Year: 2019, Month: 1, Day: 1}),
			columnType:    "DATE",
			schema:        &bigquery.FieldSchema{Type: "DATE"},
			expectedType:  "string",
			expectedValue: "2019-01-01",
		},
		{
			name:          "DATE repeated",
			value:         bigquery.Value([]bigquery.Value{civil.Date{Year: 2019, Month: 1, Day: 1}, civil.Date{Year: 2019, Month: 2, Day: 1}}),
			columnType:    "DATE",
			schema:        &bigquery.FieldSchema{Type: "DATE", Repeated: true},
			expectedType:  "string",
			expectedValue: "2019-01-01,2019-02-01",
		},
		{
			name:          "DATETIME",
			value:         bigquery.Value(civil.DateTime{Date: civil.Date{Year: 2019, Month: 1, Day: 1}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}}),
			columnType:    "DATETIME",
			schema:        &bigquery.FieldSchema{Type: "DATETIME"},
			expectedType:  "string",
			expectedValue: "2019-01-01 01:01:01",
		},
		{
			name: "DATETIME repeated",
			value: bigquery.Value([]bigquery.Value{
				civil.DateTime{Date: civil.Date{Year: 2019, Month: 1, Day: 1}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}},
				civil.DateTime{Date: civil.Date{Year: 2019, Month: 2, Day: 1}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}},
			}),
			columnType:    "DATETIME",
			schema:        &bigquery.FieldSchema{Type: "DATETIME", Repeated: true},
			expectedType:  "string",
			expectedValue: "2019-01-01 01:01:01,2019-02-01 01:01:01",
		},
		{
			name:          "TIME",
			value:         bigquery.Value(civil.Time{Hour: 1, Minute: 1, Second: 1}),
			columnType:    "TIME",
			schema:        &bigquery.FieldSchema{Type: "TIME"},
			expectedType:  "string",
			expectedValue: "01:01:01",
		},
		{
			name:          "TIME repeated",
			value:         bigquery.Value([]bigquery.Value{civil.Time{Hour: 1, Minute: 1, Second: 1}, civil.Time{Hour: 2, Minute: 1, Second: 1}}),
			columnType:    "TIME",
			schema:        &bigquery.FieldSchema{Type: "TIME", Repeated: true},
			expectedType:  "string",
			expectedValue: "01:01:01,02:01:01",
		},
		{
			name:          "GEOGRAPHY",
			value:         bigquery.Value("POINT(1.0 1.0)"),
			columnType:    "GEOGRAPHY",
			schema:        &bigquery.FieldSchema{Type: "GEOGRAPHY"},
			expectedType:  "string",
			expectedValue: "POINT(1.0 1.0)",
		},
		{
			name:          "GEOGRAPHY repeated",
			value:         bigquery.Value([]bigquery.Value{"POINT(1.0 1.0)", "POINT(2.0 2.0)"}),
			columnType:    "GEOGRAPHY",
			schema:        &bigquery.FieldSchema{Type: "GEOGRAPHY", Repeated: true},
			expectedType:  "string",
			expectedValue: "POINT(1.0 1.0),POINT(2.0 2.0)",
		},
		{
			name: "RECORD",
			value: bigquery.Value([]bigquery.Value{
				bigquery.Value(int64(1)),
				bigquery.Value(float64(1.99999)),
				bigquery.Value("text value"),
				bigquery.Value(civil.Time{Hour: 1, Minute: 1, Second: 1}),
				bigquery.Value(civil.DateTime{Date: civil.Date{Year: 2019, Month: 1, Day: 1}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}}),
				[]bigquery.Value{
					bigquery.Value(int64(1)),
					bigquery.Value(float64(1.99999)),
					bigquery.Value("text value"),
					bigquery.Value(civil.Time{Hour: 1, Minute: 1, Second: 1}),
					bigquery.Value(civil.DateTime{Date: civil.Date{Year: 2019, Month: 1, Day: 1}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}}),
				},
			}),
			columnType: "RECORD",
			schema: &bigquery.FieldSchema{
				Type: "RECORD",
				Schema: bigquery.Schema{
					{Name: "col1", Type: "INT"},
					{Name: "col2", Type: "FLOAT64"},
					{Name: "col3", Type: "STRING"},
					{Name: "col4", Type: "TIME"},
					{Name: "col5", Type: "DATETIME"},
					{Name: "col6", Type: "RECORD", Schema: bigquery.Schema{
						{Name: "nested1", Type: "INT"},
						{Name: "nested2", Type: "FLOAT64"},
						{Name: "nested3", Type: "STRING"},
						{Name: "nested4", Type: "TIME"},
						{Name: "nested5", Type: "DATETIME"},
					}},
				},
			},
			expectedType:  "map[string]interface {}",
			expectedValue: "{\"col1\":1,\"col2\":1.99999,\"col3\":\"text value\",\"col4\":\"01:01:01\",\"col5\":\"2019-01-01 01:01:01\",\"col6\":{\"nested1\":1,\"nested2\":1.99999,\"nested3\":\"text value\",\"nested4\":\"01:01:01\",\"nested5\":\"2019-01-01 01:01:01\"}}",
		},

		{
			name: "RECORD repeated",
			value: bigquery.Value([]bigquery.Value{
				[]bigquery.Value{
					bigquery.Value(int64(1)),
					bigquery.Value(float64(1.99999)),
					bigquery.Value("text value"),
					bigquery.Value(civil.Time{Hour: 1, Minute: 1, Second: 1}),
					bigquery.Value(civil.DateTime{Date: civil.Date{Year: 2019, Month: 1, Day: 1}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}}),
				},
				[]bigquery.Value{
					bigquery.Value(int64(2)),
					bigquery.Value(float64(2.99999)),
					bigquery.Value("text value 2"),
					bigquery.Value(civil.Time{Hour: 2, Minute: 2, Second: 2}),
					bigquery.Value(civil.DateTime{Date: civil.Date{Year: 2019, Month: 2, Day: 2}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}}),
				},
			}),
			columnType: "RECORD",
			schema: &bigquery.FieldSchema{
				Type:     "RECORD",
				Repeated: true,
				Schema: bigquery.Schema{
					{Name: "col1", Type: "INT"},
					{Name: "col2", Type: "FLOAT64"},
					{Name: "col3", Type: "STRING"},
					{Name: "col4", Type: "TIME"},
					{Name: "col5", Type: "DATETIME"},
				},
			},
			expectedType:  "[]interface {}",
			expectedValue: "[{\"col1\":1,\"col2\":1.99999,\"col3\":\"text value\",\"col4\":\"01:01:01\",\"col5\":\"2019-01-01 01:01:01\"},{\"col1\":2,\"col2\":2.99999,\"col3\":\"text value 2\",\"col4\":\"02:02:02\",\"col5\":\"2019-02-02 01:01:01\"}]",
		},
		{
			name: "RECORD repeated with nil values",
			value: bigquery.Value([]bigquery.Value{
				nil,
				[]bigquery.Value{
					bigquery.Value(int64(2)),
					bigquery.Value(float64(2.99999)),
					bigquery.Value("text value 2"),
					bigquery.Value(civil.Time{Hour: 2, Minute: 2, Second: 2}),
					bigquery.Value(civil.DateTime{Date: civil.Date{Year: 2019, Month: 2, Day: 2}, Time: civil.Time{Hour: 1, Minute: 1, Second: 1}}),
				},
			}),
			columnType: "RECORD",
			schema: &bigquery.FieldSchema{
				Type:     "RECORD",
				Repeated: true,
				Schema: bigquery.Schema{
					{Name: "col1", Type: "INT"},
					{Name: "col2", Type: "FLOAT64"},
					{Name: "col3", Type: "STRING"},
					{Name: "col4", Type: "TIME"},
					{Name: "col5", Type: "DATETIME"},
				},
			},
			expectedType:  "[]interface {}",
			expectedValue: "[null,{\"col1\":2,\"col2\":2.99999,\"col3\":\"text value 2\",\"col4\":\"02:02:02\",\"col5\":\"2019-02-02 01:01:01\"}]",
		},
		{
			name:          "TIMESTAMP",
			value:         bigquery.Value(time.Date(2023, 12, 25, 10, 30, 45, 123456789, time.UTC)),
			columnType:    "TIMESTAMP",
			schema:        &bigquery.FieldSchema{Type: "TIMESTAMP"},
			expectedType:  "time.Time",
			expectedValue: "2023-12-25 10:30:45.123456789 +0000 UTC",
		},
		{
			name:          "TIMESTAMP repeated",
			value:         bigquery.Value([]bigquery.Value{time.Date(2023, 12, 25, 10, 30, 45, 0, time.UTC), time.Date(2023, 12, 26, 11, 31, 46, 0, time.UTC)}),
			columnType:    "TIMESTAMP",
			schema:        &bigquery.FieldSchema{Type: "TIMESTAMP", Repeated: true},
			expectedType:  "string",
			expectedValue: "2023-12-25 10:30:45 +0000 UTC,2023-12-26 11:31:46 +0000 UTC",
		},
		{
			name:          "JSON",
			value:         bigquery.Value(`{"name": "John", "age": 30}`),
			columnType:    "JSON",
			schema:        &bigquery.FieldSchema{Type: "JSON"},
			expectedType:  "string",
			expectedValue: `{"name": "John", "age": 30}`,
		},
		{
			name:          "JSON repeated",
			value:         bigquery.Value([]bigquery.Value{`{"name": "John", "age": 30}`, `{"name": "Jane", "age": 25}`}),
			columnType:    "JSON",
			schema:        &bigquery.FieldSchema{Type: "JSON", Repeated: true},
			expectedType:  "string",
			expectedValue: `{"name": "John", "age": 30},{"name": "Jane", "age": 25}`,
		},
		{
			name:          "INTERVAL",
			value:         bigquery.Value(&bigquery.IntervalValue{SubSecondNanos: 1000}),
			columnType:    "INTERVAL",
			schema:        &bigquery.FieldSchema{Type: "INTERVAL"},
			expectedType:  "string",
			expectedValue: "0-0 0 0:0:0.000001",
		},
		{
			name:          "INTERVAL repeated",
			value:         bigquery.Value([]bigquery.Value{&bigquery.IntervalValue{SubSecondNanos: 1000}, &bigquery.IntervalValue{Years: 1, SubSecondNanos: 2000}}),
			columnType:    "INTERVAL",
			schema:        &bigquery.FieldSchema{Type: "INTERVAL", Repeated: true},
			expectedType:  "string",
			expectedValue: "0-0 0 0:0:0.000001,1-0 0 0:0:0.000002",
		},
		{
			name:          "RANGE",
			value:         bigquery.Value(&bigquery.RangeValue{Start: bigquery.Value(1), End: bigquery.Value(5)}),
			columnType:    "RANGE",
			schema:        &bigquery.FieldSchema{Type: "RANGE"},
			expectedType:  "string",
			expectedValue: "[1,5)",
		},
		{
			name:          "RANGE repeated",
			value:         bigquery.Value([]bigquery.Value{&bigquery.RangeValue{Start: bigquery.Value(1), End: bigquery.Value(5)}, &bigquery.RangeValue{Start: bigquery.Value(10), End: bigquery.Value(20)}}),
			columnType:    "RANGE",
			schema:        &bigquery.FieldSchema{Type: "RANGE", Repeated: true},
			expectedType:  "string",
			expectedValue: "[1,5),[10,20)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v, err := ConvertColumnValue(tt.value, tt.schema)
			require.NoError(t, err)

			assert.Equal(t, tt.expectedType, fmt.Sprintf("%T", v))

			if tt.schema.Type == "RECORD" {
				json, err := json.Marshal(v)
				require.NoError(t, err)
				v = string(json)
			}

			assert.Equal(t, tt.expectedValue, fmt.Sprintf("%v", v))
		})
	}
}
