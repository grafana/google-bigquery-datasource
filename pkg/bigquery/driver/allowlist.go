package driver

import (
	"context"
	"fmt"
	"strings"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// BigQuery reports at most 50 referenced tables in query statistics; beyond
// that the list is incomplete and the allowlist cannot be verified.
const maxReportedReferencedTables = 50

// Statement types for which dry-run statistics cannot be trusted to list every
// referenced table (multi-statement scripts, dynamic SQL, procedure calls).
var allowlistDeniedStatementTypes = map[string]bool{
	"SCRIPT":            true,
	"EXECUTE_IMMEDIATE": true,
	"CALL":              true,
}

// CheckAllowedDatasets verifies that every table referenced by a query, as
// reported by a dry run, belongs to one of the allowed datasets. Entries are
// either "project.dataset" or a bare "dataset", which is qualified with
// defaultProject. It fails closed when the referenced tables cannot be
// reliably determined.
func CheckAllowedDatasets(stats *bq.QueryStatistics, allowedDatasets []string, defaultProject string) error {
	if len(allowedDatasets) == 0 {
		return nil
	}
	if stats == nil {
		return fmt.Errorf("could not determine the tables referenced by the query: this data source only allows queries against specific datasets")
	}
	if allowlistDeniedStatementTypes[stats.StatementType] {
		return fmt.Errorf("multi-statement scripts, EXECUTE IMMEDIATE and procedure calls are not supported because this data source only allows queries against specific datasets")
	}
	if len(stats.ReferencedTables) >= maxReportedReferencedTables {
		return fmt.Errorf("the query references too many tables (%d or more) to verify against the allowed datasets of this data source", maxReportedReferencedTables)
	}

	allowed := make(map[string]bool, len(allowedDatasets))
	for _, entry := range allowedDatasets {
		if !strings.Contains(entry, ".") {
			entry = defaultProject + "." + entry
		}
		allowed[entry] = true
	}

	for _, table := range stats.ReferencedTables {
		if !allowed[table.ProjectID+"."+table.DatasetID] {
			return fmt.Errorf("the query references table %q, which is not in the allowed datasets of this data source", table.ProjectID+"."+table.DatasetID+"."+table.TableID)
		}
	}
	return nil
}

// enforceAllowedDatasets dry-runs the query and rejects it if it references
// tables outside the configured dataset allowlist. It is a no-op when no
// allowlist is configured.
func (c *Conn) enforceAllowedDatasets(ctx context.Context, query string) error {
	if len(c.cfg.AllowedDatasets) == 0 {
		return nil
	}

	q := c.client.Query(query)
	q.DryRun = true
	q.Location = c.client.Location
	q.Labels = c.headersAsLabels(ctx)

	job, err := q.Run(ctx)
	if err != nil {
		// The real run would fail with the same error; surface it directly.
		return err
	}

	var stats *bq.QueryStatistics
	if status := job.LastStatus(); status != nil && status.Statistics != nil {
		stats, _ = status.Statistics.Details.(*bq.QueryStatistics)
	}

	if err := CheckAllowedDatasets(stats, c.cfg.AllowedDatasets, c.cfg.Project); err != nil {
		return backend.DownstreamError(err)
	}
	return nil
}
