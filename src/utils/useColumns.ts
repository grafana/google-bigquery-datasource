import { toOption } from '@grafana/data';
import { BigQueryAPI } from 'api';
import { useAsync } from 'react-use';
import { QueryWithDefaults } from 'types';

type Options = {
  query: QueryWithDefaults;
  apiClient: BigQueryAPI;
  isOrderable?: boolean;
};

export function useColumns({ apiClient, query, isOrderable = false }: Options) {
  const state = useAsync(async () => {
    if (!query.location || !query.dataset || !query.table) {
      return;
    }
    const columns = await apiClient.getColumns(query.location, query.dataset, query.table, isOrderable);
    return columns.map(toOption);
  }, [apiClient, query.dataset, query.location, query.table]);

  return state;
}
