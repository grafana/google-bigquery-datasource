package routes

import (
	"encoding/json"
	"io"
	"io/ioutil"
	"net/http"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

type ResourceHandler struct {
	ds bigquery.BigqueryDatasourceIface
}

type reqBody struct {
	Location string `json:"location"`
	Project  string `json:"project"`
	Dataset  string `json:"dataset"`
	Table    string `json:"table"`
}

func New(ds *bigquery.BigQueryDatasource) *ResourceHandler {
	return &ResourceHandler{ds: ds}
}

func (r *ResourceHandler) datasets(rw http.ResponseWriter, req *http.Request) {
	reqBody, err := parseBody(req.Body)
	if err != nil {
		rw.WriteHeader(http.StatusBadRequest)
		write(rw, []byte(err.Error()))
		return
	}

	res, err := r.ds.Datasets(req.Context(), reqBody.Project, reqBody.Location)
	sendResponse(res, err, rw)
}

func (r *ResourceHandler) tables(rw http.ResponseWriter, req *http.Request) {
	reqBody, err := parseBody(req.Body)
	if err != nil {
		rw.WriteHeader(http.StatusBadRequest)
		write(rw, []byte(err.Error()))
		return
	}

	res, err := r.ds.Tables(req.Context(), reqBody.Project, reqBody.Location, reqBody.Dataset)
	sendResponse(res, err, rw)
}

func (r *ResourceHandler) tableSchema(rw http.ResponseWriter, req *http.Request) {
	reqBody, err := parseBody(req.Body)
	if err != nil {
		rw.WriteHeader(http.StatusBadRequest)
		write(rw, []byte(err.Error()))
		return
	}

	res, err := r.ds.TableSchema(req.Context(), reqBody.Project, reqBody.Location, reqBody.Dataset, reqBody.Table)
	rw.Header().Set("Content-Type", "application/json")
	sendResponse(res, err, rw)
}

func (r *ResourceHandler) Routes() map[string]func(http.ResponseWriter, *http.Request) {
	return map[string]func(http.ResponseWriter, *http.Request){
		"/datasets":             r.datasets,
		"/dataset/tables":       r.tables,
		"/dataset/table/schema": r.tableSchema,
	}
}

func parseBody(body io.ReadCloser) (*reqBody, error) {
	reqBody := &reqBody{}
	b, err := ioutil.ReadAll(body)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(b, reqBody)
	if err != nil {
		return nil, err
	}
	return reqBody, nil
}

func write(rw http.ResponseWriter, b []byte) {
	_, err := rw.Write(b)
	if err != nil {
		log.DefaultLogger.Error(err.Error())
	}
}

func sendResponse(res interface{}, err error, rw http.ResponseWriter) {
	if err != nil {
		rw.WriteHeader(http.StatusBadRequest)
		write(rw, []byte(err.Error()))
		return
	}
	bytes, err := json.Marshal(res)
	if err != nil {
		log.DefaultLogger.Error(err.Error())
		rw.WriteHeader(http.StatusInternalServerError)
		write(rw, []byte(err.Error()))
		return
	}
	rw.Header().Add("Content-Type", "application/json")
	write(rw, bytes)
}
