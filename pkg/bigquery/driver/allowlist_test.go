package driver

import (
	"testing"

	bq "cloud.google.com/go/bigquery"
	"github.com/stretchr/testify/assert"
)

func TestCheckAllowedDatasets(t *testing.T) {
	tests := []struct {
		name               string
		stats              *bq.QueryStatistics
		accessibleProjects []string
		additionalDatasets []string
		defaultProject     string
		wantErr            string
	}{
		{
			name:               "missing statistics fail closed",
			stats:              nil,
			accessibleProjects: []string{"myproject"},
			defaultProject:     "myproject",
			wantErr:            "could not determine the tables referenced by the query",
		},
		{
			name:               "query without table references is allowed",
			stats:              &bq.QueryStatistics{StatementType: "SELECT"},
			accessibleProjects: []string{"myproject"},
			defaultProject:     "myproject",
		},
		{
			name:               "scripts are rejected",
			stats:              &bq.QueryStatistics{StatementType: "SCRIPT"},
			accessibleProjects: []string{"myproject"},
			defaultProject:     "myproject",
			wantErr:            "multi-statement scripts",
		},
		{
			name:               "execute immediate is rejected",
			stats:              &bq.QueryStatistics{StatementType: "EXECUTE_IMMEDIATE"},
			accessibleProjects: []string{"myproject"},
			defaultProject:     "myproject",
			wantErr:            "multi-statement scripts",
		},
		{
			name:               "procedure calls are rejected",
			stats:              &bq.QueryStatistics{StatementType: "CALL"},
			accessibleProjects: []string{"myproject"},
			defaultProject:     "myproject",
			wantErr:            "multi-statement scripts",
		},
		{
			name: "table in an accessible project is allowed",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "sales", TableID: "orders"},
				},
			},
			accessibleProjects: []string{"myproject", "otherproject"},
			defaultProject:     "myproject",
		},
		{
			name: "table outside accessible projects is rejected",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "bigquery-public-data", DatasetID: "crypto_bitcoin", TableID: "transactions"},
				},
			},
			accessibleProjects: []string{"myproject"},
			defaultProject:     "myproject",
			wantErr:            `"bigquery-public-data.crypto_bitcoin.transactions"`,
		},
		{
			name: "additional dataset entry allows a foreign table",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "bigquery-public-data", DatasetID: "samples", TableID: "shakespeare"},
				},
			},
			accessibleProjects: []string{"myproject"},
			additionalDatasets: []string{"bigquery-public-data.samples"},
			defaultProject:     "myproject",
		},
		{
			name: "additional dataset entry only covers its own dataset",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "bigquery-public-data", DatasetID: "crypto_bitcoin", TableID: "transactions"},
				},
			},
			accessibleProjects: []string{"myproject"},
			additionalDatasets: []string{"bigquery-public-data.samples"},
			defaultProject:     "myproject",
			wantErr:            `"bigquery-public-data.crypto_bitcoin.transactions"`,
		},
		{
			name: "bare additional entry is qualified with the default project",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "sales", TableID: "orders"},
				},
			},
			accessibleProjects: nil,
			additionalDatasets: []string{"sales"},
			defaultProject:     "myproject",
		},
		{
			name: "bare additional entry does not match the same dataset in another project",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "otherproject", DatasetID: "sales", TableID: "orders"},
				},
			},
			accessibleProjects: nil,
			additionalDatasets: []string{"sales"},
			defaultProject:     "myproject",
			wantErr:            `"otherproject.sales.orders"`,
		},
		{
			name: "no accessible projects and no additional datasets rejects everything",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "sales", TableID: "orders"},
				},
			},
			accessibleProjects: nil,
			defaultProject:     "myproject",
			wantErr:            `"myproject.sales.orders"`,
		},
		{
			name: "mixed references across accessible project and additional dataset",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "sales", TableID: "orders"},
					{ProjectID: "bigquery-public-data", DatasetID: "samples", TableID: "shakespeare"},
				},
			},
			accessibleProjects: []string{"myproject"},
			additionalDatasets: []string{"bigquery-public-data.samples"},
			defaultProject:     "myproject",
		},
		{
			name: "matching is case-sensitive",
			stats: &bq.QueryStatistics{
				StatementType: "SELECT",
				ReferencedTables: []*bq.Table{
					{ProjectID: "myproject", DatasetID: "mydataset", TableID: "orders"},
				},
			},
			accessibleProjects: nil,
			additionalDatasets: []string{"MyDataset"},
			defaultProject:     "myproject",
			wantErr:            `"myproject.mydataset.orders"`,
		},
		{
			name: "too many referenced tables fail closed",
			stats: &bq.QueryStatistics{
				StatementType:    "SELECT",
				ReferencedTables: makeReferencedTables(50),
			},
			accessibleProjects: []string{"myproject"},
			defaultProject:     "myproject",
			wantErr:            "references too many tables",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckAllowedDatasets(tt.stats, tt.accessibleProjects, tt.additionalDatasets, tt.defaultProject)
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
