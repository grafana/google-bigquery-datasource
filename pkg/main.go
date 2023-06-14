package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"

	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery"
)

func main() {
	// Start listening to requests send from Grafana. This call is blocking so
	// it wont finish until Grafana shuts down the process or the plugin choose
	// to exit close down by itself
	log.DefaultLogger.Info("Starting BQ plugin")

	if err := datasource.Manage(
		"grafana-bigquery-datasource",
		bigquery.NewDatasource,
		datasource.ManageOpts{},
	); err != nil {
		log.DefaultLogger.Error(err.Error())
		os.Exit(1)
	}
}
