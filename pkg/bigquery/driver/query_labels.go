package driver

import (
	"context"
	"net/http"
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

type headersKey struct{}

// WithHeaders attaches the HTTP headers of the current request, which headersAsLabels reads.
func WithHeaders(ctx context.Context, headers http.Header) context.Context {
	return context.WithValue(ctx, headersKey{}, headers)
}

// headersAsLabels returns a map of the request headers attached by WithHeaders
// that are present in the wanted header list. The keys in the map are cleaned and formatted
// as per the requirements specified in the BigQuery documentation.
// The values in the map are the corresponding cleaned and formatted header values.
// It also adds the plugin ID and, when JobLabelUser is set, the user login from the request context.
func (c *Conn) headersAsLabels(ctx context.Context) map[string]string {
	labels := make(map[string]string)
	wantedHeaders := []string{HeaderPluginID, HeaderDatasourceUID, HeaderDashboardUID, HeaderPanelID, HeaderPanelPluginId, HeaderQueryGroupID, HeaderFromExpression}

	// The connection is cached across requests, so the per-request headers come from ctx.
	headers, _ := ctx.Value(headersKey{}).(http.Header)
	for _, h := range wantedHeaders {
		if v := headers.Values(h); len(v) > 0 {
			labels[cleanStringForLabelOrValue(h, true)] = cleanStringForLabelOrValue(v[0], false)
		}
	}
	pluginContext := backend.PluginConfigFromContext(ctx)
	if pluginContext.PluginID != "" {
		labels[cleanStringForLabelOrValue(HeaderPluginID, true)] = pluginContext.PluginID
	}
	// The user comes from the plugin context, so the label does not need the server-wide send_user_header setting.
	if user := backend.UserFromContext(ctx); c.cfg.JobLabelUser && user != nil && user.Login != "" {
		labels["x-grafana-user"] = cleanStringForLabelOrValue(user.Login, false)
	}
	return labels
}
