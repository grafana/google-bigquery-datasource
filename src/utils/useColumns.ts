import { toOption } from '@grafana/data';
import { getApiClient } from 'api';
import { useAsync } from 'react-use';
import { QueryWithDefaults } from '../types';
import { getDatasourceId } from '../utils';

type Options = {
  query: QueryWithDefaults;
  isOrderable?: boolean;
};

export function useColumns({ query, isOrderable = false }: Options) {
  const datasourceId = getDatasourceId();
  const { value: apiClient } = useAsync(async () => await getApiClient(datasourceId), []);

  const state = useAsync(async () => {
    if (!query.location || !query.dataset || !query.table || !apiClient) {
      return;
    }

    const columns = await apiClient.getColumns(query.location, query.dataset, query.table, isOrderable);
    return columns.map(toOption);
  }, [apiClient, query.dataset, query.location, query.table]);

  return state;
}
