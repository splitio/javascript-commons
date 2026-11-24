import { pollingManagerCSFactory } from '../pollingManagerCS';
import { mySegmentsSyncTaskFactory } from '../syncTasks/mySegmentsSyncTask';
import { mySegmentsFetcherFactory } from '../fetchers/mySegmentsFetcher';
import { syncTaskFactory } from '../../__tests__/syncTask.mock';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

jest.mock('../syncTasks/mySegmentsSyncTask', () => ({
  mySegmentsSyncTaskFactory: jest.fn(() => syncTaskFactory())
}));
jest.mock('../syncTasks/definitionsSyncTask', () => ({
  definitionsSyncTaskFactory: jest.fn(() => syncTaskFactory())
}));

function createParams() {
  return {
    serviceApi: { fetchMemberships: jest.fn(() => Promise.resolve({ json: () => ({}) })), fetchConfigsMemberships: jest.fn(() => Promise.resolve({ json: () => ({}) })) },
    storage: { definitions: { usesSegments: () => false }, rbSegments: { usesSegments: () => false } },
    readiness: { definitions: { on: jest.fn(), once: jest.fn() }, segments: { emit: jest.fn() }, isReady: () => false },
    settings: { log: loggerMock, core: { key: 'user1' }, sync: { enabled: true } },
  } as any;
}

describe('pollingManagerCS', () => {

  afterEach(() => {
    (mySegmentsSyncTaskFactory as jest.Mock).mockClear();
  });

  function assertMySegmentsFetcher(fetchMemberships: jest.Mock) {
    const calls = (mySegmentsSyncTaskFactory as jest.Mock).mock.calls;
    expect(calls.map(call => call[4])).toEqual(['user1', 'user2']);

    // the same fetcher is shared by the MySegmentsSyncTask of every client
    const mySegmentsFetcher = calls[0][0];
    expect(calls[1][0]).toBe(mySegmentsFetcher);

    mySegmentsFetcher('user2', true, 10);
    expect(fetchMemberships).toHaveBeenCalledWith('user2', true, 10);
  }

  test('fetches memberships with `serviceApi.fetchMemberships` by default', () => {
    const params = createParams();
    const pollingManager = pollingManagerCSFactory()(params);
    pollingManager.add('user2', params.readiness, params.storage);

    assertMySegmentsFetcher(params.serviceApi.fetchMemberships);
    expect(params.serviceApi.fetchConfigsMemberships).not.toHaveBeenCalled();
  });

  test('fetches memberships with the fetcher created by the provided `mySegmentFetcherFactory`', () => {
    const params = createParams();
    const pollingManager = pollingManagerCSFactory(undefined, (params) => mySegmentsFetcherFactory(params.serviceApi.fetchConfigsMemberships))(params);
    pollingManager.add('user2', params.readiness, params.storage);

    assertMySegmentsFetcher(params.serviceApi.fetchConfigsMemberships);
    expect(params.serviceApi.fetchMemberships).not.toHaveBeenCalled();
  });
});
