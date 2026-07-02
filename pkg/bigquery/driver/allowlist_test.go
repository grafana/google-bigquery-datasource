package driver

import (
	"testing"

	bq "cloud.google.com/go/bigquery"
	"github.com/stretchr/testify/assert"
)

func TestCheckAllowedDatasets(t *testing.T) {
	tests := []struct {
		name            string
		stats           *bq.QueryStatistics
		allowedDatasets []string
		defaultProject  string
		wantErr         string
	}{
		{
			name:            "no allowlist configured allows everything",
			stats:           nil,
			allowedDatasets: nil,
		},
		{
			name:            "missing statistics fail closed",
			stats:           nil,
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
			wantErr:         "could not determine the tables referenced by the query",
		},
		{
			name:            "query without table references is allowed",
			stats:           &bq.QueryStatistics{StatementType: "SELECT"},
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
		},
		{
			name:            "scripts are rejected",
			stats:           &bq.QueryStatistics{StatementType: "SCRIPT"},
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
			wantErr:         "multi-statement scripts",
		},
		{
			name:            "execute immediate is rejected",
			stats:           &bq.QueryStatistics{StatementType: "EXECUTE_IMMEDIATE"},
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
			wantErr:         "multi-statement scripts",
		},
		{
			name:            "procedure calls are rejected",
			stats:           &bq.QueryStatistics{StatementType: "CALL"},
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
			wantErr:         "multi-statement scripts",
		},
		{
			name: "table in fully qualified entry is allowed",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "otherproject", DatasetID: "analytics", TableID: "events"},
				},
			},
			allowedDatasets: []string{"otherproject.analytics"},
			defaultProject:  "myproject",
		},
		{
			name: "table outside the allowlist is rejected",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "bigquery-public-data", DatasetID: "crypto_bitcoin", TableID: "transactions"},
				},
			},
			allowedDatasets: []string{"myproject.mydataset"},
			defaultProject:  "myproject",
			wantErr:         `"bigquery-public-data.crypto_bitcoin.transactions"`,
		},
		{
			name: "bare entry is qualified with the default project",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "mydataset", TableID: "orders"},
				},
			},
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
		},
		{
			name: "bare entry does not match the same dataset in another project",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "otherproject", DatasetID: "mydataset", TableID: "orders"},
				},
			},
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
			wantErr:         `"otherproject.mydataset.orders"`,
		},
		{
			name: "multiple entries with mixed references",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "sales", TableID: "orders"},
					{ProjectID: "otherproject", DatasetID: "analytics", TableID: "events"},
				},
			},
			allowedDatasets: []string{"sales", "otherproject.analytics"},
			defaultProject:  "myproject",
		},
		{
			name: "matching is case-sensitive",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "mydataset", TableID: "orders"},
				},
			},
			allowedDatasets: []string{"MyDataset"},
			defaultProject:  "myproject",
			wantErr:         `"myproject.mydataset.orders"`,
		},
		{
			name: "too many referenced tables fail closed",
			stats: &bq.QueryStatistics{
				StatementType:    "SELECT",
				ReferencedTables: makeReferencedTables(50),
			},
			allowedDatasets: []string{"mydataset"},
			defaultProject:  "myproject",
			wantErr:         "references too many tables",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckAllowedDatasets(tt.stats, tt.allowedDatasets, tt.defaultProject)
			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				assert.ErrorContains(t, err, tt.wantErr)
			}
		})
	}
}

func makeReferencedTables(n int) []*bq.Table {
	tables := make([]*bq.Table, n)
	for i := range tables {
		tables[i] = &bq.Table{ProjectID: "myproject", DatasetID: "mydataset", TableID: "orders"}
	}
	return tables
}
