package api

import (
	"encoding/json"
	"testing"
	"time"

	bq "cloud.google.com/go/bigquery"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToTableMetadataResponse(t *testing.T) {
	t.Run("carries the descriptive table metadata", func(t *testing.T) {
		modified := time.Date(2026, 10, 13, 8, 30, 0, 0, time.UTC)
		expires := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)

		result, err := toTableMetadataResponse(&bq.TableMetadata{
			Description:      "One row per channel.\n**Grain**: `channel_id`",
			Type:             bq.MaterializedView,
			Labels:           map[string]string{"team": "data", "tier": "gold"},
			NumRows:          14741,
			LastModifiedTime: modified,
			ExpirationTime:   expires,
			Clustering:       &bq.Clustering{Fields: []string{"channel_id", "account_id"}},
			Schema:           bq.Schema{{Name: "channel_id", Type: bq.StringFieldType, Description: "Slack channel id"}},
		})
		require.NoError(t, err)

		assert.Equal(t, "One row per channel.\n**Grain**: `channel_id`", result.Description)
		assert.Equal(t, bq.MaterializedView, result.Type)
		assert.Equal(t, map[string]string{"team": "data", "tier": "gold"}, result.Labels)
		assert.Equal(t, uint64(14741), result.NumRows)
		assert.True(t, modified.Equal(result.LastModifiedTime), "got %s", result.LastModifiedTime)
		assert.True(t, expires.Equal(result.ExpirationTime), "got %s", result.ExpirationTime)
		require.NotNil(t, result.Clustering)
		assert.Equal(t, []string{"channel_id", "account_id"}, result.Clustering.Fields)
		require.Len(t, result.Schema, 1)
		assert.Equal(t, "Slack channel id", result.Schema[0].Description)
	})

	t.Run("names the new fields in the JSON the resource returns", func(t *testing.T) {
		result, err := toTableMetadataResponse(&bq.TableMetadata{
			Description:      "d",
			Type:             bq.ViewTable,
			Labels:           map[string]string{"a": "b"},
			NumRows:          7,
			LastModifiedTime: time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC),
			ExpirationTime:   time.Date(2026, 2, 3, 4, 5, 6, 0, time.UTC),
			Clustering:       &bq.Clustering{Fields: []string{"x"}},
		})
		require.NoError(t, err)

		body, err := json.Marshal(result)
		require.NoError(t, err)
		assert.JSONEq(t, `{
			"timePartitioning": {},
			"rangePartitioning": {},
			"description": "d",
			"type": "VIEW",
			"labels": {"a": "b"},
			"numRows": 7,
			"lastModifiedTime": "2026-01-02T03:04:05Z",
			"expirationTime": "2026-02-03T04:05:06Z",
			"clustering": {"fields": ["x"]}
		}`, string(body))
	})

	t.Run("keeps a row count beyond 2^53 intact", func(t *testing.T) {
		const rows = uint64(1) << 60

		result, err := toTableMetadataResponse(&bq.TableMetadata{NumRows: rows})
		require.NoError(t, err)

		assert.Equal(t, rows, result.NumRows)
	})

	t.Run("returns the same JSON as before for a table that sets none of the new fields", func(t *testing.T) {
		result, err := toTableMetadataResponse(&bq.TableMetadata{
			Schema:                 bq.Schema{{Name: "id", Type: bq.IntegerFieldType, Repeated: true, Description: "row id"}},
			TimePartitioning:       &bq.TimePartitioning{Type: bq.DayPartitioningType, Field: "created"},
			RangePartitioning:      &bq.RangePartitioning{Field: "bucket"},
			RequirePartitionFilter: true,
		})
		require.NoError(t, err)

		body, err := json.Marshal(result)
		require.NoError(t, err)
		assert.JSONEq(t, `{
			"schema": [{"name": "id", "description": "row id", "type": "INTEGER", "repeated": true}],
			"timePartitioning": {"type": "DAY", "field": "created"},
			"rangePartitioning": {"field": "bucket"},
			"requirePartitionFilter": true
		}`, string(body))
	})

	t.Run("omits every new field for an empty table", func(t *testing.T) {
		result, err := toTableMetadataResponse(&bq.TableMetadata{})
		require.NoError(t, err)

		body, err := json.Marshal(result)
		require.NoError(t, err)
		assert.JSONEq(t, `{"timePartitioning": {}, "rangePartitioning": {}}`, string(body))
	})

	t.Run("reports each BigQuery table type by name", func(t *testing.T) {
		for _, tableType := range []bq.TableType{bq.RegularTable, bq.ViewTable, bq.ExternalTable, bq.MaterializedView, bq.Snapshot} {
			result, err := toTableMetadataResponse(&bq.TableMetadata{Type: tableType})
			require.NoError(t, err)
			assert.Equal(t, tableType, result.Type)
		}
	})
}
