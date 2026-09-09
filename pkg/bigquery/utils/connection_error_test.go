package utils

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"golang.org/x/oauth2"
	"google.golang.org/api/googleapi"
)

func TestCategorizeConnectionError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected ConnectionErrorCategory
	}{
		{
			name:     "nil error",
			err:      nil,
			expected: ConnectionErrorCategoryNone,
		},

		// --- Timeout ---
		{
			name:     "context deadline exceeded",
			err:      context.DeadlineExceeded,
			expected: ConnectionErrorCategoryTimeout,
		},
		{
			name:     "context canceled",
			err:      context.Canceled,
			expected: ConnectionErrorCategoryTimeout,
		},
		{
			name:     "wrapped context deadline exceeded",
			err:      fmt.Errorf("outer: %w", context.DeadlineExceeded),
			expected: ConnectionErrorCategoryTimeout,
		},
		{
			name:     "googleapi 408",
			err:      &googleapi.Error{Code: 408, Message: "Request Timeout"},
			expected: ConnectionErrorCategoryTimeout,
		},
		{
			name:     "googleapi 504",
			err:      &googleapi.Error{Code: 504, Message: "Gateway Timeout"},
			expected: ConnectionErrorCategoryTimeout,
		},
		{
			name:     "timeout in error string",
			err:      errors.New("read tcp: i/o timeout"),
			expected: ConnectionErrorCategoryTimeout,
		},
		{
			name:     "deadline exceeded in error string",
			err:      errors.New("operation timed out: deadline exceeded"),
			expected: ConnectionErrorCategoryTimeout,
		},

		// --- Auth ---
		{
			name:     "googleapi 401",
			err:      &googleapi.Error{Code: 401, Message: "Unauthorized"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "googleapi 403",
			err:      &googleapi.Error{Code: 403, Message: "Permission denied"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "wrapped googleapi 403",
			err:      fmt.Errorf("ping: %w", &googleapi.Error{Code: 403, Message: "Permission denied"}),
			expected: ConnectionErrorCategoryAuth,
		},
		{
			// Regression guard: googleapi.Error is checked (by typed .Code) before
			// the string-based TLS fallback, so a "certificate" mention inside an
			// auth-failure message can't get shadowed into ConnectionErrorCategoryTLS
			// the way a clickhouse HTTP-transport string error could.
			name:     "googleapi 403 mentioning certificate is still auth, not tls",
			err:      &googleapi.Error{Code: 403, Message: "Invalid authentication: SSL certificate revoked"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "googleapi remaining 4xx falls through to auth",
			err:      &googleapi.Error{Code: 410, Message: "Gone"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "oauth2 invalid_grant",
			err:      &oauth2.RetrieveError{ErrorCode: "invalid_grant", ErrorDescription: "Invalid JWT Signature"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "oauth2 access_denied",
			err:      &oauth2.RetrieveError{ErrorCode: "access_denied"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "oauth2 invalid_client is a rejected identity, not a config problem",
			err:      &oauth2.RetrieveError{ErrorCode: "invalid_client", ErrorDescription: "The OAuth client was not found."},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "oauth2 unauthorized_client is a rejected identity, not a config problem",
			err:      &oauth2.RetrieveError{ErrorCode: "unauthorized_client"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			// Nothing in the datasource config UI controls the OAuth grant type
			// or request shape, so there's no "config" field for a user to fix.
			name:     "oauth2 invalid_request is an OAuth exchange failure, not a config problem",
			err:      &oauth2.RetrieveError{ErrorCode: "invalid_request", ErrorDescription: "Missing parameter: grant_type"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "oauth2 unsupported_grant_type is an OAuth exchange failure, not a config problem",
			err:      &oauth2.RetrieveError{ErrorCode: "unsupported_grant_type"},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "oauth2 response status code falls back to auth, not config, when the status is config-shaped",
			err:      &oauth2.RetrieveError{Response: &http.Response{StatusCode: 404}},
			expected: ConnectionErrorCategoryAuth,
		},
		{
			name:     "oauth2 response status code still surfaces a transient server failure",
			err:      &oauth2.RetrieveError{Response: &http.Response{StatusCode: 503}},
			expected: ConnectionErrorCategoryServer,
		},

		// --- Config ---
		{
			name:     "googleapi 400",
			err:      &googleapi.Error{Code: 400, Message: "Bad Request"},
			expected: ConnectionErrorCategoryConfig,
		},
		{
			name:     "googleapi 404",
			err:      &googleapi.Error{Code: 404, Message: "Not Found"},
			expected: ConnectionErrorCategoryConfig,
		},
		{
			name:     "does not use a token provider",
			err:      fmt.Errorf(`auth type "foo" does not use a token provider middleware`),
			expected: ConnectionErrorCategoryConfig,
		},
		{
			name:     "workload identity pool provider required",
			err:      errors.New("workloadIdentityFederation requires workloadIdentityPoolProvider to be configured"),
			expected: ConnectionErrorCategoryConfig,
		},
		{
			name:     "missing authentication details",
			err:      errors.New("datasource is missing authentication details"),
			expected: ConnectionErrorCategoryConfig,
		},
		{
			name:     "could not unmarshal settings",
			err:      fmt.Errorf("could not unmarshal DataSourceInfo json: %w", errors.New("unexpected end of JSON input")),
			expected: ConnectionErrorCategoryConfig,
		},
		{
			name:     "failed to retrieve default gce project",
			err:      fmt.Errorf("Failed to retrieve default GCE project: %w", errors.New("metadata: GCE metadata \"project/project-id\" not defined")),
			expected: ConnectionErrorCategoryConfig,
		},
		{
			name:     "malformed private key",
			err:      errors.New("private key should be a PEM or plain PKCS1 or PKCS8; parse error: asn1: syntax error"),
			expected: ConnectionErrorCategoryConfig,
		},

		// --- Server ---
		{
			name:     "googleapi 500",
			err:      &googleapi.Error{Code: 500, Message: "Internal Server Error"},
			expected: ConnectionErrorCategoryServer,
		},
		{
			name:     "googleapi 429 rate limited",
			err:      &googleapi.Error{Code: 429, Message: "Too Many Requests"},
			expected: ConnectionErrorCategoryServer,
		},
		{
			name:     "googleapi 503",
			err:      &googleapi.Error{Code: 503, Message: "Service Unavailable"},
			expected: ConnectionErrorCategoryServer,
		},

		// --- Network ---
		{
			name: "net.OpError dial connection refused",
			err: &net.OpError{
				Op:  "dial",
				Net: "tcp",
				Err: &net.AddrError{Err: "connection refused"},
			},
			expected: ConnectionErrorCategoryNetwork,
		},
		{
			name:     "net.DNSError",
			err:      &net.DNSError{Err: "no such host", Name: "invalid.example.com"},
			expected: ConnectionErrorCategoryNetwork,
		},
		{
			name:     "connection refused in string",
			err:      errors.New("dial tcp: connect: connection refused"),
			expected: ConnectionErrorCategoryNetwork,
		},
		{
			name:     "no such host in string",
			err:      errors.New("dial tcp: lookup invalid.example.com: no such host"),
			expected: ConnectionErrorCategoryNetwork,
		},
		{
			name:     "network is unreachable",
			err:      errors.New("dial tcp: connect: network is unreachable"),
			expected: ConnectionErrorCategoryNetwork,
		},
		{
			name:     "connection reset by peer",
			err:      errors.New("read tcp: connection reset by peer"),
			expected: ConnectionErrorCategoryNetwork,
		},

		// --- TLS ---
		{
			name: "tls.CertificateVerificationError",
			err: &tls.CertificateVerificationError{
				UnverifiedCertificates: []*x509.Certificate{},
				Err:                    errors.New("certificate signed by unknown authority"),
			},
			expected: ConnectionErrorCategoryTLS,
		},
		{
			name:     "x509.UnknownAuthorityError",
			err:      x509.UnknownAuthorityError{},
			expected: ConnectionErrorCategoryTLS,
		},
		{
			name: "x509.CertificateInvalidError",
			err: x509.CertificateInvalidError{
				Cert:   &x509.Certificate{},
				Reason: x509.Expired,
			},
			expected: ConnectionErrorCategoryTLS,
		},
		{
			name: "x509.HostnameError",
			err: x509.HostnameError{
				Certificate: &x509.Certificate{},
				Host:        "wrong.host.example.com",
			},
			expected: ConnectionErrorCategoryTLS,
		},
		{
			name:     "tls: in error string",
			err:      errors.New("tls: handshake failure"),
			expected: ConnectionErrorCategoryTLS,
		},
		{
			name:     "x509: in error string",
			err:      errors.New("x509: certificate has expired or is not yet valid"),
			expected: ConnectionErrorCategoryTLS,
		},
		{
			name: "net.OpError wrapping TLS error (read op, not dial)",
			err: &net.OpError{
				Op:  "read",
				Net: "tcp",
				Err: errors.New("tls: certificate signed by unknown authority"),
			},
			expected: ConnectionErrorCategoryTLS,
		},

		// --- Unknown ---
		{
			name:     "completely unknown error",
			err:      errors.New("something went very wrong"),
			expected: ConnectionErrorCategoryUnknown,
		},
		{
			name:     "error reading query params is not a datasource config problem",
			err:      fmt.Errorf("error reading query params: %s", "unexpected end of JSON input"),
			expected: ConnectionErrorCategoryUnknown,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CategorizeConnectionError(tt.err)
			assert.Equal(t, tt.expected, got)
		})
	}
}
