package driver

import (
	"context"
	"fmt"
	"strings"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// BigQuery reports at most 50 referenced tables in query statistics; beyond
// that the list is incomplete and dataset access cannot be verified.
const maxReportedReferencedTables = 50

// Statement types for which dry-run statistics cannot be trusted to list every
// referenced table (multi-statement scripts, dynamic SQL, procedure calls).
var allowlistDeniedStatementTypes = map[string]bool{
	"SCRIPT":            true,
	"EXECUTE_IMMEDIATE": true,
	"CALL":              true,
}

// CheckAllowedDatasets verifies that every table referenced by a query, as
// reported by a dry run, either belongs to one of the accessible projects or
// to one of the additionally allowed datasets. Dataset entries are either
// "project.dataset" or a bare "dataset", which is qualified with
// defaultProject. It fails closed when the referenced tables cannot be
// reliably determined.
func CheckAllowedDatasets(stats *bq.QueryStatistics, accessibleProjects []string, additionalDatasets []string, defaultProject string) error {
	if stats == nil {
		return fmt.Errorf("could not determine the tables referenced by the query: this data source restricts which datasets can be queried")
	}
	if allowlistDeniedStatementTypes[stats.StatementType] {
		return fmt.Errorf("multi-statement scripts, EXECUTE IMMEDIATE and procedure calls are not supported because this data source restricts which datasets can be queried")
	}
	if len(stats.ReferencedTables) >= maxReportedReferencedTables {
		return fmt.Errorf("the query references too many tables (%d or more) to verify dataset access for this data source", maxReportedReferencedTables)
	}

	projects := make(map[string]bool, len(accessibleProjects))
	for _, project := range accessibleProjects {
		projects[project] = true
	}

	datasets := make(map[string]bool, len(additionalDatasets))
	for _, entry := range additionalDatasets {
		if !strings.Contains(entry, ".") {
			entry = defaultProject + "." + entry
		}
		datasets[entry] = true
	}

	for _, table := range stats.ReferencedTables {
		if !projects[table.ProjectID] && !datasets[table.ProjectID+"."+table.DatasetID] {
			return fmt.Errorf("the query references table %q, which is outside the projects accessible to this data source and not in its additional allowed datasets", table.ProjectID+"."+table.DatasetID+"."+table.TableID)
		}
	}
	return nil
}

// enforceAllowedDatasets dry-runs the query and rejects it if it references
// tables outside the projects accessible to the data source and the
// additionally allowed datasets. It is a no-op when the restriction is not
// enabled.
func (c *Conn) enforceAllowedDatasets(ctx context.Context, query string) error {
	if !c.cfg.RestrictToAccessibleDatasets {
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

	// When project enumeration fails, fall back to checking against the
	// additional allowed datasets alone; never fail open.
	var accessibleProjects []string
	var projectsErr error
	if c.cfg.AccessibleProjects != nil {
		accessibleProjects, projectsErr = c.cfg.AccessibleProjects(ctx)
	}

	checkErr := CheckAllowedDatasets(stats, accessibleProjects, c.cfg.AdditionalAllowedDatasets, c.cfg.Project)
	if checkErr != nil && projectsErr != nil {
		checkErr = fmt.Errorf("%s (could not list accessible projects: %s)", checkErr, projectsErr)
	}
	if checkErr != nil {
		return backend.DownstreamError(checkErr)
	}
	return nil
}
