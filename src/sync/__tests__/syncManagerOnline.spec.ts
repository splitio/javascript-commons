import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { syncTaskFactory } from './syncTask.mock';
import { syncManagerOnlineFactory } from '../syncManagerOnline';
import { IReadinessManager } from '../../readiness/types';
import { SDK_SPLITS_CACHE_LOADED } from '../../readiness/constants';

jest.mock('../submitters/submitterManager', () => {
  return {
    submitterManagerFactory: syncTaskFactory
  };
});

// Mocked storageManager
const storageManagerMock = {
  splits: {
    usesSegments: () => false
  }
};

// @ts-expect-error
// Mocked readinessManager
let readinessManagerMock = {
  isReady: jest.fn(() => true) // Fake the signal for the non ready SDK
} as IReadinessManager;


// Mocked pollingManager
const pollingManagerMock = {
  syncAll: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn(),
  add: jest.fn(() => { return { isRunning: () => true }; }),
  get: jest.fn()
};

const pushManagerMock = {
  start: jest.fn(),
  on: jest.fn(),
  stop: jest.fn()
};

// Mocked pushManager
const pushManagerFactoryMock = jest.fn(() => pushManagerMock);

test('syncManagerOnline should start or not the submitter depending on user consent status', async () => {
  const settings = { ...fullSettings };

  const syncManager = syncManagerOnlineFactory()({
    settings, // @ts-ignore
    storage: {},
  });
  const submitterManager = syncManager.submitterManager!;

  await syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(1);
  expect(submitterManager.start).lastCalledWith(false); // SubmitterManager should start all submitters, if userConsent is undefined
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(1);

  settings.userConsent = 'UNKNOWN';
  await syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(2);
  expect(submitterManager.start).lastCalledWith(true); // SubmitterManager should start only telemetry submitter, if userConsent is unknown
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(2);
  syncManager.flush();
  expect(submitterManager.execute).toBeCalledTimes(1);
  expect(submitterManager.execute).lastCalledWith(true); // SubmitterManager should flush only telemetry, if userConsent is unknown

  settings.userConsent = 'GRANTED';
  await syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(3);
  expect(submitterManager.start).lastCalledWith(false); // SubmitterManager should start all submitters, if userConsent is granted
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(3);
  syncManager.flush();
  expect(submitterManager.execute).toBeCalledTimes(2);
  expect(submitterManager.execute).lastCalledWith(false); // SubmitterManager should flush all submitters, if userConsent is granted

  settings.userConsent = 'DECLINED';
  await syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(4);
  expect(submitterManager.start).lastCalledWith(true); // SubmitterManager should start only telemetry submitter, if userConsent is declined
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(4);
  syncManager.flush();
  expect(submitterManager.execute).toBeCalledTimes(3);
  expect(submitterManager.execute).lastCalledWith(true); // SubmitterManager should flush only telemetry, if userConsent is unknown

});

test('syncManagerOnline should syncAll a single time when sync is disabled', async () => {
  const settings = { ...fullSettings };

  // disable sync
  settings.sync.enabled = false;

  // @ts-ignore
  // Test pushManager for main client
  const syncManager = syncManagerOnlineFactory(() => pollingManagerMock, pushManagerFactoryMock)({
    settings, // @ts-ignore
    storage: { validateCache: () => { return Promise.resolve({ initialCacheLoad: true, lastUpdateTimestamp: undefined }); } },
  });

  expect(pushManagerFactoryMock).not.toBeCalled();

  // Test pollingManager for Main client
  await syncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.syncAll).toBeCalledTimes(1);

  syncManager.stop();
  await syncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.syncAll).toBeCalledTimes(1);

  syncManager.stop();
  await syncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.syncAll).toBeCalledTimes(1);

  syncManager.stop();

  // @ts-ignore
  // Test pollingManager for shared client
  const pollingSyncManagerShared = syncManager.shared('sharedKey', readinessManagerMock, storageManagerMock);

  if (!pollingSyncManagerShared) throw new Error('pollingSyncManagerShared should exist');

  expect(pollingManagerMock.start).not.toBeCalled();

  pollingSyncManagerShared.stop();

  expect(pollingManagerMock.start).not.toBeCalled();

  pollingSyncManagerShared.stop();

  await syncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();

  syncManager.stop();
  await syncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();

  syncManager.stop();

  // @ts-ignore
  // Test pollingManager for shared client
  const pushingSyncManagerShared = syncManager.shared('pushingSharedKey', readinessManagerMock, storageManagerMock);

  if (!pushingSyncManagerShared) throw new Error('pushingSyncManagerShared should exist');

  expect(pollingManagerMock.start).not.toBeCalled();

  pushingSyncManagerShared.stop();

  expect(pollingManagerMock.start).not.toBeCalled();

  pushingSyncManagerShared.stop();

  settings.sync.enabled = true;
  // @ts-ignore
  // pushManager instantiation control test
  const testSyncManager = syncManagerOnlineFactory(() => pollingManagerMock, pushManagerFactoryMock)({
    settings, // @ts-ignore
    storage: { validateCache: () => Promise.resolve({ initialCacheLoad: true, lastUpdateTimestamp: undefined }) },
  });

  expect(pushManagerFactoryMock).toBeCalled();

  // Test pollingManager for Main client
  await testSyncManager.start();

  expect(pushManagerMock.start).toBeCalled();

  testSyncManager.stop();

});

test('syncManagerOnline should emit SDK_SPLITS_CACHE_LOADED if validateCache returns false', async () => {
  const lastUpdateTimestamp = Date.now() - 1000 * 60 * 60; // 1 hour ago
  const params = {
    settings: fullSettings,
    storage: { validateCache: () => Promise.resolve({ initialCacheLoad: false, lastUpdateTimestamp }) },
    readiness: { splits: { emit: jest.fn() } }
  }; // @ts-ignore
  const syncManager = syncManagerOnlineFactory()(params);

  await syncManager.start();

  expect(params.readiness.splits.emit).toBeCalledWith(SDK_SPLITS_CACHE_LOADED, { initialCacheLoad: false, lastUpdateTimestamp });

  syncManager.stop();
});
