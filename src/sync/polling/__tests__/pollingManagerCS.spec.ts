import { pollingManagerCSFactory } from '../pollingManagerCS';
import { mySegmentsSyncTaskFactory } from '../syncTasks/mySegmentsSyncTask';
import { definitionsSyncTaskFactory } from '../syncTasks/definitionsSyncTask';
import { mySegmentsFetcherFactory } from '../fetchers/mySegmentsFetcher';
import { syncTaskFactory } from '../../__tests__/syncTask.mock';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { Backoff } from '../../../utils/Backoff';

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

  beforeAll(() => {
    Backoff.__TEST__BASE_MILLIS = 1;
  });

  afterEach(() => {
    Backoff.__TEST__BASE_MILLIS = undefined;
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

  function getSyncTasks() {
    const definitionsSyncTask = (definitionsSyncTaskFactory as jest.Mock).mock.results.slice(-1)[0].value;
    const mySegmentsSyncTasks = (mySegmentsSyncTaskFactory as jest.Mock).mock.results.map(result => result.value);
    return { definitionsSyncTask, mySegmentsSyncTasks };
  }

  test.each([
    ['single sync', { enabled: false, streamingEnabled: false }],
    ['streaming', { enabled: true, streamingEnabled: true }],
  ])('syncAll retries with backoff the fetch of definitions and memberships of all clients (%s)', async (_, { enabled, streamingEnabled }) => {
    const params = createParams();
    params.settings.sync.enabled = enabled;
    params.settings.streamingEnabled = streamingEnabled;
    const pollingManager = pollingManagerCSFactory()(params);
    const { definitionsSyncTask, mySegmentsSyncTasks: [user1SyncTask] } = getSyncTasks();
    definitionsSyncTask.execute.mockResolvedValueOnce(false).mockResolvedValue(true); // fails the first time
    user1SyncTask.execute.mockResolvedValueOnce(false).mockResolvedValue(true); // fails the first time

    pollingManager.add('user2', params.readiness, params.storage); // added before the SyncManager starts
    const [, user2SyncTask] = getSyncTasks().mySegmentsSyncTasks;
    user2SyncTask.execute.mockResolvedValue(true);

    // the SyncManager is running (`startSync`), but has not called `syncAll` yet: the fetch with backoff runs only once
    (mySegmentsSyncTaskFactory as jest.Mock).mockImplementationOnce(() => { const syncTask = syncTaskFactory(); syncTask.execute.mockResolvedValue(true); return syncTask; });
    pollingManager.add('user3', params.readiness, params.storage, true);
    const [, , user3SyncTask] = getSyncTasks().mySegmentsSyncTasks;
    // segments are not used: in single sync, the initial fetch is skipped (smart ready), but in streaming it is not
    expect(user3SyncTask.execute).toHaveBeenCalledTimes(enabled ? 1 : 0);

    expect(await pollingManager.syncAll()).toEqual([true, true, true, true]);

    expect(definitionsSyncTask.execute).toHaveBeenCalledTimes(2);
    expect(user1SyncTask.execute).toHaveBeenCalledTimes(2);
    expect(user2SyncTask.execute).toHaveBeenCalledTimes(1);
    expect(user3SyncTask.execute).toHaveBeenCalledTimes(1);
    expect(user3SyncTask.start).not.toHaveBeenCalled(); // not polling

    pollingManager.stop();
  });

  test.each(['start', 'stop'] as const)('%s halts the retries of syncAll', async (method) => {
    const params = createParams();
    const pollingManager = pollingManagerCSFactory()(params);
    const { definitionsSyncTask, mySegmentsSyncTasks: [user1SyncTask] } = getSyncTasks();
    [definitionsSyncTask, user1SyncTask].forEach(syncTask => syncTask.execute.mockResolvedValue(false)); // always fails

    const syncAllPromise = pollingManager.syncAll();
    await new Promise(resolve => setTimeout(resolve)); // wait for the first attempt to fail and schedule a retry
    pollingManager[method]();

    expect(await syncAllPromise).toEqual([false, false]);
    expect(definitionsSyncTask.execute).toHaveBeenCalledTimes(1);
    expect(user1SyncTask.execute).toHaveBeenCalledTimes(1);

    pollingManager.stop();
  });
});
