package driver

import (
	"context"
	"regexp"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

const (
	HeaderPluginID       = "X-Plugin-Id"
	HeaderDatasourceUID  = "X-Datasource-Uid"
	HeaderDashboardUID   = "X-Dashboard-Uid"
	HeaderPanelID        = "X-Panel-Id"
	HeaderPanelPluginId  = "X-Panel-Plugin-Id"
	HeaderQueryGroupID   = "X-Query-Group-Id"
	HeaderFromExpression = "X-Grafana-From-Expr"
)

// cleanStringForLabelOrValue removes invalid characters, non-alphabetic leading character,
// duplicate hyphens, converts string to lowercase, and truncates it to 63 characters.
// It is used to clean strings for label or value purposes, following the requirements
// specified in the documentation at https://cloud.google.com/bigquery/docs/labels-intro#requirements.
//
// Parameters:
// - s: the string to be cleaned
//
// Returns:
// - the cleaned string
func cleanStringForLabelOrValue(s string, isKey bool) string {

	// remove invalid characters
	validCharRegex, _ := regexp.Compile("[^a-zA-Z0-9_-]")
	result := validCharRegex.ReplaceAllString(s, "")

	if isKey {
		// remove non-alphabetic leading character
		invalidLeadCharRegex, _ := regexp.Compile("^[^a-zA-Z]+")
		result = invalidLeadCharRegex.ReplaceAllString(result, "")
	}

	// remove duplicate hyphens
	doubleSeparatorRegex, _ := regexp.Compile("([_-]){2,}") // captures the last character of the sequence e.g. _- would capture -
	result = doubleSeparatorRegex.ReplaceAllString(result, "$1")

	// convert to lowercase
	result = strings.ToLower(result)

	// truncate to 63 characters
	if len(result) > 63 {
		result = result[:63]
	}

	return result
}

// headerInList checks if the given `header` is present in the `headersList`.
// It returns `true` if the header is found, otherwise it returns `false`.
func headerInList(header string, headersList []string) bool {
	for _, h := range headersList {
		if h == header {
			return true
		}
	}
	return false
}

// headersAsLabels returns a map of headers from the ConnectionSettings configuration
// that are present in the wanted header list. The keys in the map are cleaned and formatted
// as per the requirements specified in the BigQuery documentation.
// The values in the map are the corresponding cleaned and formatted values from the configuration.
// It returns the map of headers as labels.
func (c *Conn) headersAsLabels(ctx context.Context) map[string]string {
	labels := make(map[string]string)
	wantedHeaders := []string{HeaderPluginID, HeaderDatasourceUID, HeaderDashboardUID, HeaderPanelID, HeaderPanelPluginId, HeaderQueryGroupID, HeaderFromExpression}

	for k, v := range c.cfg.Headers {
		if headerInList(k, wantedHeaders) && len(v) > 0 {
			labels[cleanStringForLabelOrValue(k, true)] = cleanStringForLabelOrValue(v[0], false)
		}
	}
	pluginContext := backend.PluginConfigFromContext(ctx)
	if pluginContext.PluginID != "" {
		labels[cleanStringForLabelOrValue(HeaderPluginID, true)] = pluginContext.PluginID
	}
	return labels
}
