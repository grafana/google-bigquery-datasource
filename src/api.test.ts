import { setDataSourceSrv } from '@grafana/runtime';

import { getApiClient } from './api';

describe('api', () => {
  const datasourceUid = 'abc';
  const mockResponse = {
    message: 'Hello World',
  };

  const defaultProjectSpy = jest.fn();
  const getSpy = jest.fn();
  const postResource = jest.fn();

  const setupDatasource = (spy: jest.Mock) => {
    postResource.mockImplementation(async (path: string) => {
      if (path === 'defaultProjects') {
        defaultProjectSpy();
        return 'defaultProject';
      }
      spy();
      return mockResponse;
    });
    getSpy.mockImplementation(async () => ({ uid: datasourceUid, postResource }));
    setDataSourceSrv({ get: getSpy } as any);
  };

  beforeEach(() => {
    defaultProjectSpy.mockClear();
    getSpy.mockClear();
    postResource.mockReset();
  });

  test('api caching', async () => {
    setupDatasource(jest.fn());

    await getApiClient(datasourceUid);
    expect(defaultProjectSpy).toHaveBeenCalled();

    await getApiClient(datasourceUid);
    expect(defaultProjectSpy).toHaveBeenCalledTimes(1);
  });

  test('resource calls go through DataSourceWithBackend.postResource', async () => {
    setupDatasource(jest.fn());
    const client = await getApiClient(datasourceUid);
    postResource.mockClear();

    await client.getDatasets('us', 'proj');
    await client.getProjects();
    await client.getTables({ project: 'p', location: 'us', dataset: 'd' } as any);
    await client.getColumns({ project: 'p', location: 'us', dataset: 'd', table: 't' } as any, true);
    await client.getTableSchema({ project: 'p', location: 'us', dataset: 'd', table: 't' } as any);

    expect(getSpy).toHaveBeenCalledWith({ uid: datasourceUid });
    expect(postResource.mock.calls).toEqual([
      ['datasets', { project: 'proj', location: 'us' }],
      ['projects', { datasourceUid }],
      ['tables', { project: 'p', location: 'us', dataset: 'd' }],
      ['columns', { project: 'p', location: 'us', dataset: 'd', table: 't', isOrderable: 'true' }],
      [
        'dataset/table/schema',
        { project: 'p', location: 'us', dataset: 'd', table: 't' },
        { showErrorAlert: false, showSuccessAlert: false },
      ],
    ]);
  });

  test('returns an uncached client when defaultProjects fails', async () => {
    setupDatasource(jest.fn());
    postResource.mockRejectedValueOnce(new Error('auth failure'));

    const client = await getApiClient('failing-uid');
    expect(client.getDefaultProject()).toBe('');

    await getApiClient('failing-uid');
    expect(postResource).toHaveBeenCalledTimes(2);
  });

  it.each`
    method              | connArgs
    ${'getDatasets'}    | ${['us']}
    ${'getTables'}      | ${['us', 'my-dataset']}
    ${'getColumns'}     | ${['us', 'my-dataset', 'my-table']}
    ${'getTableSchema'} | ${['us', 'my-dataset', 'my-table']}
  `('$method returns cached values', async ({ method, connArgs }) => {
    const callsSpy = jest.fn();
    setupDatasource(callsSpy);
    const apiClient = await getApiClient(datasourceUid);

    const res1 = await (apiClient as any)[method](...connArgs);
    expect(res1).toEqual(mockResponse);
    expect(callsSpy).toHaveBeenCalledTimes(1);

    const res2 = await (apiClient as any)[method](...connArgs);
    expect(res2).toEqual(mockResponse);
    expect(callsSpy).toHaveBeenCalledTimes(1);

    await apiClient.dispose();
    const res3 = await (apiClient as any)[method](...connArgs);
    expect(res3).toEqual(mockResponse);
    expect(callsSpy).toHaveBeenCalledTimes(2);
  });
});
