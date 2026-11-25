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

var wantedHeaders = []string{HeaderPluginID, HeaderDatasourceUID, HeaderDashboardUID, HeaderPanelID, HeaderPanelPluginId, HeaderQueryGroupID, HeaderFromExpression}

type requestHeadersKey struct{}

// ContextWithHeaders stores the label headers of the current request on ctx.
// Only headers in the wanted list are kept.
func ContextWithHeaders(ctx context.Context, headers http.Header) context.Context {
	kept := http.Header{}
	for _, name := range wantedHeaders {
		if v := headers.Values(name); len(v) > 0 {
			kept[name] = v
		}
	}
	return context.WithValue(ctx, requestHeadersKey{}, kept)
}

func headersFromContext(ctx context.Context) http.Header {
	h, _ := ctx.Value(requestHeadersKey{}).(http.Header)
	return h
}

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

// headersAsLabels returns BigQuery job labels built from the wanted headers of the
// request carried on ctx (see ContextWithHeaders), cleaned as per the BigQuery label
// requirements. Headers stored on the connection are deliberately ignored: connections
// are shared across requests, so they would label jobs with another request's values.
func (c *Conn) headersAsLabels(ctx context.Context) map[string]string {
	labels := make(map[string]string)

	headers := headersFromContext(ctx)
	for _, name := range wantedHeaders {
		if v := headers.Values(name); len(v) > 0 {
			labels[cleanStringForLabelOrValue(name, true)] = cleanStringForLabelOrValue(v[0], false)
		}
	}
	pluginContext := backend.PluginConfigFromContext(ctx)
	if pluginContext.PluginID != "" {
		labels[cleanStringForLabelOrValue(HeaderPluginID, true)] = pluginContext.PluginID
	}
	return labels
}
