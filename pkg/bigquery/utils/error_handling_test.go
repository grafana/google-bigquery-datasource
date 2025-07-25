package utils

import (
	"errors"
	"net/http"
	"testing"

	"google.golang.org/api/googleapi"
)

func TestHandleError_GoogleAPIError(t *testing.T) {
	// Create a Google API error
	googleErr := &googleapi.Error{
		Code:    403,
		Message: "Permission denied",
	}

	// Test HandleError function
	errorResp, statusCode := HandleError(googleErr, "test operation")

	// Verify the response
	if statusCode != 403 {
		t.Errorf("Expected status code 403, got %d", statusCode)
	}

	if errorResp.Error != "Permission denied" {
		t.Errorf("Expected error message 'Permission denied', got '%s'", errorResp.Error)
	}

	if errorResp.Code != 403 {
		t.Errorf("Expected error code 403, got %d", errorResp.Code)
	}

	expectedMessage := "Google API error: Permission denied"
	if errorResp.Message != expectedMessage {
		t.Errorf("Expected message '%s', got '%s'", expectedMessage, errorResp.Message)
	}
}

func TestHandleError_GenericError(t *testing.T) {
	// Create a generic error
	genericErr := errors.New("connection timeout")

	// Test HandleError function
	errorResp, statusCode := HandleError(genericErr, "database connection")

	// Verify the response
	if statusCode != http.StatusInternalServerError {
		t.Errorf("Expected status code %d, got %d", http.StatusInternalServerError, statusCode)
	}

	if errorResp.Error != "connection timeout" {
		t.Errorf("Expected error message 'connection timeout', got '%s'", errorResp.Error)
	}

	if errorResp.Code != 0 {
		t.Errorf("Expected error code 0 for generic error, got %d", errorResp.Code)
	}

	expectedMessage := "Error in database connection: connection timeout"
	if errorResp.Message != expectedMessage {
		t.Errorf("Expected message '%s', got '%s'", expectedMessage, errorResp.Message)
	}
}

func TestHandleError_NilError(t *testing.T) {
	// Test with nil error
	errorResp, statusCode := HandleError(nil, "test operation")

	// Verify the response
	if statusCode != 0 {
		t.Errorf("Expected status code 0 for nil error, got %d", statusCode)
	}

	if errorResp.Error != "" {
		t.Errorf("Expected empty error message for nil error, got '%s'", errorResp.Error)
	}
}

// Example function demonstrating usage
func ExampleHandleError() {
	// Simulate a Google API error
	googleErr := &googleapi.Error{
		Code:    400,
		Message: "Invalid query",
	}

	errorResp, statusCode := HandleError(googleErr, "BigQuery query execution")

	// Use the structured response
	_ = errorResp // ErrorResponse{Error: "Invalid query", Message: "Google API error: Invalid query", Code: 400}
	_ = statusCode // 400
} 