package api

import (
	"context"

	bq "cloud.google.com/go/bigquery"
	"github.com/grafana/grafana-bigquery-datasource/pkg/bigquery/types"
)

type API struct {
	Client *bq.Client
}

func New(client *bq.Client) *API {
	return &API{client}
}

func (a *API) ListDatasets(ctx context.Context) ([]string, error) {

	result := make([]string, 2)
	result[0] = "test_dataset"
	result[1] = "test_dataset2"

	// it := a.Client.Datasets(ctx)
	// for {
	// 	dataset, err := it.Next()
	// 	if err == iterator.Done {
	// 		break
	// 	}
	// 	if err != nil {
	// 		return nil, err
	// 	}

	// 	result = append(result, dataset.DatasetID)
	// }

	return result, nil
}

func (a *API) ListTables(ctx context.Context, dataset string) ([]string, error) {
	// datasetRef := a.Client.Dataset(dataset)
	result := make([]string, 2)
	result[0] = "test_table"
	result[1] = "test_table2"
	// result := []string{}

	// it := datasetRef.Tables(ctx)
	// for {
	// 	table, err := it.Next()
	// 	if err == iterator.Done {
	// 		break
	// 	}
	// 	if err != nil {
	// 		return nil, err
	// 	}

	// 	result = append(result, table.TableID)
	// }

	return result, nil
}

func (a *API) GetTableSchema(ctx context.Context, dataset, table string) (*types.TableMetadataResponse, error) {
	// tableMeta, err := a.Client.Dataset(dataset).Table(table).Metadata(ctx)
	// if err != nil {
	// 	return nil, errors.WithMessage(err, fmt.Sprintf("Failed to retrieve %s table metadata", table))
	// }

	// response, _ := json.Marshal(tableMeta)
	// result := &types.TableMetadataResponse{}

	// if err := json.Unmarshal(response, result); err != nil {
	// 	return nil, errors.WithMessage(err, fmt.Sprintf("Failed to parse %s table metadata", table))
	// }

	return nil, nil
}

func (a *API) SetLocation(location string) {
	// a.Client.Location = location
}
