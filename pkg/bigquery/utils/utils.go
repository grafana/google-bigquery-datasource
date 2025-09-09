package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"google.golang.org/api/googleapi"
)

func ColumnsFromTableSchema(schema bq.Schema, isOrderable bool) []string {
	result := []string{}

	for _, field := range schema {
		if field.Schema != nil {
			nestedSchema := ColumnsFromTableSchema(field.Schema, isOrderable)
			result = append(result, field.Name)
			for _, nestedField := range nestedSchema {
				if isOrderable {
					if isFieldOrderable(field) {
						result = append(result, fmt.Sprintf("%s.%s", field.Name, nestedField))
					}
				} else {
					result = append(result, fmt.Sprintf("%s.%s", field.Name, nestedField))

				}
			}
		} else {
			if isOrderable {
				if isFieldOrderable(field) {
					result = append(result, field.Name)
				}
			} else {
				result = append(result, field.Name)
			}
		}
	}

	return result
}

// Filters out fields that are not orderable GEOGRAPHY, ARRAY, STRUCT, RECORD
// See https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types#orderable_data_types
func isFieldOrderable(f *bq.FieldSchema) bool {
	return f.Type != bq.GeographyFieldType && f.Type != bq.RecordFieldType
}

func UnmarshalBody(body io.ReadCloser, reqBody any) error {
	b, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	err = json.Unmarshal(b, &reqBody)
	if err != nil {
		return err
	}
	return nil
}

func WriteResponse(rw http.ResponseWriter, b []byte) {
	_, err := rw.Write(b)
	if err != nil {
		log.DefaultLogger.Error(err.Error())
	}
}

func SendResponse(res any, err error, rw http.ResponseWriter) {
	if err != nil {
		rw.WriteHeader(http.StatusBadRequest)
		googleApiError, success := err.(*googleapi.Error)
		if !success {
			WriteResponse(rw, []byte(err.Error()))
			return
		}
		marshaledError, err := json.Marshal(googleApiError)
		if err != nil {
			WriteResponse(rw, []byte(err.Error()))
			return
		}
		WriteResponse(rw, marshaledError)
		return
	}
	bytes, err := json.Marshal(res)
	if err != nil {
		log.DefaultLogger.Error(err.Error())
		rw.WriteHeader(http.StatusInternalServerError)
		WriteResponse(rw, []byte(err.Error()))
		return
	}
	rw.Header().Add("Content-Type", "application/json")
	WriteResponse(rw, bytes)
}

// ErrorResponse represents a structured error response
type ErrorResponse struct {
	Error   string              `json:"error"`
	Message string              `json:"message,omitempty"`
	Code    int                 `json:"code,omitempty"`
	Source  backend.ErrorSource `json:"source,omitempty"`
}

// HandleError processes an error, logs it appropriately, and returns a structured error response
// It specifically handles Google API errors with enhanced logging and proper HTTP status codes
func HandleError(ctx context.Context, err error, message string) (ErrorResponse, int) {
	if err == nil {
		return ErrorResponse{}, 0
	}
	logger := log.DefaultLogger.FromContext(ctx)

	// Check if it's a Google API error
	if googleApiError, ok := err.(*googleapi.Error); ok {
		// Log Google API error with details
		logger.Warn("Google API error",
			"message", message,
			"code", googleApiError.Code,
			"message", googleApiError.Message,
			"details", googleApiError.Details,
		)

		// Return structured response with Google API error details
		return ErrorResponse{
			Error:   googleApiError.Message,
			Message: fmt.Sprintf("Google API error: %s", googleApiError.Message),
			Code:    googleApiError.Code,
			Source:  backend.ErrorSourceFromHTTPStatus(googleApiError.Code),
		}, googleApiError.Code
	}

	// Handle generic errors
	logger.Warn(message, "error", err.Error())

	return ErrorResponse{
		Error:   err.Error(),
		Message: fmt.Sprintf("Error in %s: %s", message, err.Error()),
	}, http.StatusInternalServerError
}

// SendErrorResponse is a convenience function that handles an error and writes the response
func SendErrorResponse(ctx context.Context, err error, message string, rw http.ResponseWriter) {
	if err == nil {
		return
	}

	errorResp, statusCode := HandleError(ctx, err, message)

	rw.WriteHeader(statusCode)
	rw.Header().Set("Content-Type", "application/json")

	responseBytes, marshalErr := json.Marshal(errorResp)
	if marshalErr != nil {
		log.DefaultLogger.Error("Failed to marshal error response", "error", marshalErr.Error())
		WriteResponse(rw, []byte(`{"error":"Internal server error"}`))
		return
	}

	WriteResponse(rw, responseBytes)
}
