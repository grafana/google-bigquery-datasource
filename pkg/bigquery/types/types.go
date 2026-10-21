package types

import (
	"context"
	"time"

	bq "cloud.google.com/go/bigquery"
)

const PluginID = "grafana-bigquery-datasource"

type BigQuerySettings struct {
	DatasourceId                 int64  `json:"datasourceId"`
	ClientEmail                  string `json:"clientEmail"`
	DefaultProject               string `json:"defaultProject"`
	FlatRateProject              string `json:"flatRateProject"`
	TokenUri                     string `json:"tokenUri"`
	QueryPriority                string `json:"queryPriority"`
	ProcessingLocation           string `json:"processingLocation"`
	MaxBytesBilled               int64  `json:"MaxBytesBilled,omitempty"`
	RestrictToAccessibleDatasets bool   `json:"restrictToAccessibleDatasets,omitempty"`
	AdditionalAllowedDatasets    string `json:"additionalAllowedDatasets,omitempty"`
	// EnableSecureSocksProxy is written by Grafana's SecureSocksProxySettings
	// editor and consumed by core when it builds the datasource HTTP client, not
	// by this plugin. Declared so the settings model covers every jsonData key,
	// and lenient so a loosely typed provisioned value cannot fail the unmarshal
	// and take the datasource down. See lenient.go.
	EnableSecureSocksProxy      LenientBool `json:"enableSecureSocksProxy,omitempty"`
	Updated                     time.Time
	AuthenticationType          string `json:"authenticationType"`
	PrivateKeyPath              string `json:"privateKeyPath"`
	ServiceEndpoint             string `json:"serviceEndpoint"`
	UsingImpersonation          bool   `json:"usingImpersonation"`
	ServiceAccountToImpersonate string `json:"serviceAccountToImpersonate"`
	OAuthPassthroughEnabled     bool   `json:"oauthPassThru"`

	// Workload Identity Federation fields (read by Grafana Cloud's auth middleware)
	WorkloadIdentityPoolProvider string `json:"workloadIdentityPoolProvider"`
	WifServiceAccountEmail       string `json:"wifServiceAccountEmail"`

	// Saved in secure JSON
	PrivateKey string `json:"-"`
}

type ConnectionSettings struct {
	AuthenticationType string
	Location           string
	Project            string
	Dataset            string
	Headers            map[string][]string
	MaxBytesBilled     int64
	EnableStorageAPI   bool

	RestrictToAccessibleDatasets bool
	AdditionalAllowedDatasets    []string
	// AccessibleProjects returns the GCP projects the data source credentials
	// can enumerate. Set by the datasource when RestrictToAccessibleDatasets
	// is enabled.
	AccessibleProjects func(ctx context.Context) ([]string, error)
}
type TableFieldSchema struct {
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Type        bq.FieldType `json:"type"`
	Repeated    bool         `json:"repeated"`
	Schema      TableSchema  `json:"schema,omitempty"`
}

type TableSchema []*TableFieldSchema

type TimePartitioning struct {
	// Defines the partition interval type.  Supported values are "DAY" or "HOUR".
	Type bq.TimePartitioningType `json:"type,omitempty"`

	// The amount of time to keep the storage for a partition.
	// If the duration is empty (0), the data in the partitions do not expire.
	Expiration time.Duration `json:"expiration,omitempty"`

	// If empty, the table is partitioned by pseudo column '_PARTITIONTIME'; if set, the
	// table is partitioned by this field. The field must be a top-level TIMESTAMP or
	// DATE field. Its mode must be NULLABLE or REQUIRED.
	Field string `json:"field,omitempty"`

	// If set to true, queries that reference this table must specify a
	// partition filter (e.g. a WHERE clause) that can be used to eliminate
	// partitions. Used to prevent unintentional full data scans on large
	// partitioned tables.
	// DEPRECATED: use the top-level RequirePartitionFilter in TableMetadata.
	RequirePartitionFilter bool `json:"requirePartitionFilter,omitempty"`
}

type RangePartitioning struct {
	// The field by which the table is partitioned.
	// This field must be a top-level field, and must be typed as an
	// INTEGER/INT64.
	Field string `json:"field,omitempty"`
	// The details of how partitions are mapped onto the integer range.
	Range *bq.RangePartitioningRange `json:"range,omitempty"`
}

type Clustering struct {
	// The clustering columns, in order.
	Fields []string `json:"fields,omitempty"`
}

type TableMetadataResponse struct {
	Schema                 TableSchema       `json:"schema,omitempty"`
	TimePartitioning       TimePartitioning  `json:"timePartitioning,omitempty"`
	RangePartitioning      RangePartitioning `json:"rangePartitioning,omitempty"`
	RequirePartitionFilter bool              `json:"requirePartitionFilter,omitempty"`

	// The fields below are descriptive metadata. They are all omitted when the
	// table has no value for them, so existing clients see the same response
	// shape as before for tables that set none of them.

	// A user-provided description of the table.
	Description string `json:"description,omitempty"`
	// The kind of table: TABLE, VIEW, EXTERNAL, MATERIALIZED_VIEW or SNAPSHOT.
	Type bq.TableType `json:"type,omitempty"`
	// User-provided labels on the table.
	Labels map[string]string `json:"labels,omitempty"`
	// The number of rows, not including data still in the streaming buffer.
	NumRows uint64 `json:"numRows,omitempty"`
	// When the table was last modified. Any metadata edit, including a
	// description change, also updates it, so it can overstate data freshness.
	LastModifiedTime time.Time `json:"lastModifiedTime,omitzero"`
	// When the table expires and is deleted, if an expiration is set.
	ExpirationTime time.Time `json:"expirationTime,omitzero"`
	// The clustering columns, if the table is clustered.
	Clustering *Clustering `json:"clustering,omitempty"`
}
