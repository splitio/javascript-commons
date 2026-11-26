import { pollingManagerSSFactory } from '../pollingManagerSS';
import { syncTaskFactory } from '../../__tests__/syncTask.mock';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { Backoff } from '../../../utils/Backoff';

jest.mock('../syncTasks/segmentsSyncTask', () => ({
  segmentsSyncTaskFactory: jest.fn(() => syncTaskFactory())
}));
jest.mock('../syncTasks/definitionsSyncTask', () => ({
  definitionsSyncTaskFactory: jest.fn(() => syncTaskFactory())
}));

const params = {
  serviceApi: { fetchSegmentChanges: jest.fn() },
  settings: { log: loggerMock, scheduler: {} },
} as any;

describe('pollingManagerSS', () => {

  beforeAll(() => { Backoff.__TEST__BASE_MILLIS = 1; });
  afterAll(() => { Backoff.__TEST__BASE_MILLIS = undefined; });

  test('syncAll retries with backoff the fetch of definitions, and then of segments', async () => {
    const pollingManager = pollingManagerSSFactory(() => ({ type: 'flags' }) as any)(params);
    const { definitionsSyncTask, segmentsSyncTask } = pollingManager as any;
    definitionsSyncTask.execute.mockResolvedValueOnce(false).mockResolvedValue(true); // fails the first time
    segmentsSyncTask.execute.mockResolvedValueOnce(false).mockResolvedValue(true); // fails the first time

    // resolves once both definitions and segments are fetched
    expect(await pollingManager.syncAll()).toBe(true);
    expect(definitionsSyncTask.execute).toHaveBeenCalledTimes(2);
    expect(segmentsSyncTask.execute).toHaveBeenCalledTimes(2);

    pollingManager.stop();
  });

  test.each(['start', 'stop'] as const)('%s halts the retries of syncAll', async (method) => {
    const pollingManager = pollingManagerSSFactory(() => ({ type: 'flags' }) as any)(params);
    const { definitionsSyncTask, segmentsSyncTask } = pollingManager as any;
    definitionsSyncTask.execute.mockResolvedValue(false); // always fails

    const syncAllPromise = pollingManager.syncAll();
    await new Promise(resolve => setTimeout(resolve)); // wait for the first attempt to fail and schedule a retry
    pollingManager[method]();

    expect(await syncAllPromise).toBe(false);
    expect(definitionsSyncTask.execute).toHaveBeenCalledTimes(1);
    expect(segmentsSyncTask.execute).not.toHaveBeenCalled(); // segments are not fetched until definitions are

    pollingManager.stop();
  });
});
