package utils

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"net"
	"strings"

	"golang.org/x/oauth2"
	"google.golang.org/api/googleapi"
)

// ConnectionErrorCategory classifies a BigQuery connection/health-check
// failure into a small set of user-actionable buckets, independent of the
// specific Go error type or Google API response shape that produced it.
type ConnectionErrorCategory string

const (
	// ConnectionErrorCategoryNone is returned for a nil error: there was no
	// failure to categorize, as opposed to one categorizeConnectionError
	// couldn't classify (ConnectionErrorCategoryUnknown).
	ConnectionErrorCategoryNone    ConnectionErrorCategory = ""
	ConnectionErrorCategoryAuth    ConnectionErrorCategory = "auth"
	ConnectionErrorCategoryNetwork ConnectionErrorCategory = "network"
	ConnectionErrorCategoryTLS     ConnectionErrorCategory = "tls"
	ConnectionErrorCategoryTimeout ConnectionErrorCategory = "timeout"
	ConnectionErrorCategoryConfig  ConnectionErrorCategory = "config"
	ConnectionErrorCategoryServer  ConnectionErrorCategory = "server"
	ConnectionErrorCategoryUnknown ConnectionErrorCategory = "unknown"
)

// configErrorSubstrings match this plugin's own static config-validation
// messages (settings parsing, auth-type/http-client wiring) that are raised
// before any request reaches Google, and so have no typed representation to
// switch on.
var configErrorSubstrings = []string{
	"does not use a token provider",
	"requires workloadidentitypoolprovider",
	"missing authentication details",
	"could not unmarshal",
	"failed to retrieve default gce project",
	"error reading query params",
	"private key",
}

// CategorizeConnectionError classifies a BigQuery connection or health-check
// error. Typed errors (Google API responses, OAuth token errors, TLS/x509, net
// errors) are checked first; string matching is used only as a fallback,
// either for the plugin's own static config errors or for errors without a
// distinguishing type.
func CategorizeConnectionError(err error) ConnectionErrorCategory {
	if err == nil {
		return ConnectionErrorCategoryNone
	}

	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return ConnectionErrorCategoryTimeout
	}

	if googleErr, ok := errors.AsType[*googleapi.Error](err); ok {
		return categorizeHTTPStatus(googleErr.Code)
	}

	// Any RFC 6749 token-endpoint error (invalid_grant, invalid_client,
	// unsupported_grant_type, ...) is an OAuth exchange failure, never a
	// Grafana datasource config problem: nothing in the datasource config UI
	// controls the grant type or request shape the plugin sends, so there's
	// no "config" field for a user to go fix. The one exception is a
	// transient failure on Google's end (rate-limited/unavailable token
	// endpoint), which is worth its own category rather than being folded
	// into "auth".
	if retrieveErr, ok := errors.AsType[*oauth2.RetrieveError](err); ok {
		if retrieveErr.Response != nil {
			switch category := categorizeHTTPStatus(retrieveErr.Response.StatusCode); category {
			case ConnectionErrorCategoryTimeout, ConnectionErrorCategoryServer:
				return category
			}
		}
		return ConnectionErrorCategoryAuth
	}

	if _, ok := errors.AsType[*tls.CertificateVerificationError](err); ok {
		return ConnectionErrorCategoryTLS
	}
	if _, ok := errors.AsType[x509.UnknownAuthorityError](err); ok {
		return ConnectionErrorCategoryTLS
	}
	if _, ok := errors.AsType[x509.CertificateInvalidError](err); ok {
		return ConnectionErrorCategoryTLS
	}
	if _, ok := errors.AsType[x509.HostnameError](err); ok {
		return ConnectionErrorCategoryTLS
	}

	if opErr, ok := errors.AsType[*net.OpError](err); ok && opErr.Op == "dial" {
		return ConnectionErrorCategoryNetwork
	}
	if _, ok := errors.AsType[*net.DNSError](err); ok {
		return ConnectionErrorCategoryNetwork
	}

	errStr := strings.ToLower(err.Error())

	for _, substr := range configErrorSubstrings {
		if strings.Contains(errStr, substr) {
			return ConnectionErrorCategoryConfig
		}
	}

	// TLS string patterns must come before network patterns: TLS errors are
	// often wrapped inside a net.OpError with Op "read" rather than "dial".
	if strings.Contains(errStr, "tls:") || strings.Contains(errStr, "x509:") || strings.Contains(errStr, "certificate") {
		return ConnectionErrorCategoryTLS
	}
	if strings.Contains(errStr, "timeout") || strings.Contains(errStr, "deadline exceeded") {
		return ConnectionErrorCategoryTimeout
	}
	if strings.Contains(errStr, "connection refused") ||
		strings.Contains(errStr, "no such host") ||
		strings.Contains(errStr, "network is unreachable") ||
		strings.Contains(errStr, "connection reset by peer") {
		return ConnectionErrorCategoryNetwork
	}

	return ConnectionErrorCategoryUnknown
}

// categorizeHTTPStatus maps an HTTP status code from a Google API response
// (BigQuery, Cloud Resource Manager, or the OAuth token endpoint) to a
// category. 429/502/503 land in "server" rather than "network": they signal
// Google-side throttling/availability issues, not a problem with the path
// between the plugin and Google.
func categorizeHTTPStatus(code int) ConnectionErrorCategory {
	switch {
	case code == 401 || code == 403:
		return ConnectionErrorCategoryAuth
	case code == 408 || code == 504:
		return ConnectionErrorCategoryTimeout
	case code == 429 || code == 502 || code == 503:
		return ConnectionErrorCategoryServer
	case code == 400 || code == 404 || code == 409:
		return ConnectionErrorCategoryConfig
	case code >= 500:
		return ConnectionErrorCategoryServer
	case code >= 400:
		return ConnectionErrorCategoryAuth
	default:
		return ConnectionErrorCategoryUnknown
	}
}
