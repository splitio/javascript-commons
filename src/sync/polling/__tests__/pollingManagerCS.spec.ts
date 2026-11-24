import { pollingManagerCSFactory } from '../pollingManagerCS';
import { mySegmentsSyncTaskFactory } from '../syncTasks/mySegmentsSyncTask';
import { definitionsSyncTaskFactory } from '../syncTasks/definitionsSyncTask';
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

  test('syncAll(true) retries with backoff the memberships of clients added without `startSync` (single sync)', async () => {
    const params = createParams();
    params.settings.sync.enabled = false;
    const pollingManager = pollingManagerCSFactory()(params);
    pollingManager.add('user2', params.readiness, params.storage); // added before the SyncManager starts

    const mySegmentsSyncTasks = (mySegmentsSyncTaskFactory as jest.Mock).mock.results.map(result => result.value);
    const definitionsSyncTask = (definitionsSyncTaskFactory as jest.Mock).mock.results.slice(-1)[0].value;
    [definitionsSyncTask, ...mySegmentsSyncTasks].forEach(syncTask => syncTask.execute.mockResolvedValue(true));

    await pollingManager.syncAll(true);

    expect(mySegmentsSyncTasks.length).toBe(2); // default client (user1) and user2
    mySegmentsSyncTasks.forEach(mySegmentsSyncTask => expect(mySegmentsSyncTask.execute).toHaveBeenCalledTimes(1));

    pollingManager.stop();
  });

  test('single sync of a client added while running, before syncAll(true), executes its memberships fetch once', async () => {
    // sync tasks whose execution succeeds
    const succeedingSyncTask = () => { const syncTask = syncTaskFactory(); syncTask.execute.mockResolvedValue(true); return syncTask; };
    (definitionsSyncTaskFactory as jest.Mock).mockImplementationOnce(succeedingSyncTask);
    (mySegmentsSyncTaskFactory as jest.Mock).mockImplementation(succeedingSyncTask);

    const params = createParams();
    params.settings.sync.enabled = false;
    const pollingManager = pollingManagerCSFactory()(params);

    // the SyncManager is running (`startSync`), but has not called `syncAll(true)` yet
    pollingManager.add('user2', params.readiness, params.storage, true);
    await pollingManager.syncAll(true);

    const mySegmentsSyncTasks = (mySegmentsSyncTaskFactory as jest.Mock).mock.results.map(result => result.value);
    expect(mySegmentsSyncTasks.length).toBe(2); // default client (user1) and user2
    mySegmentsSyncTasks.forEach(mySegmentsSyncTask => expect(mySegmentsSyncTask.execute).toHaveBeenCalledTimes(1));

    pollingManager.stop();
    (mySegmentsSyncTaskFactory as jest.Mock).mockImplementation(() => syncTaskFactory());
  });
});
