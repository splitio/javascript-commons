import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { syncTaskFactory } from './syncTask.mock';
import { syncManagerOnlineFactory } from '../syncManagerOnline';
import { pushManagerFactory } from '../streaming/pushManager';
import { IPushManager } from '../streaming/types';
import { EventEmitter } from '../../utils/MinEvents';
import { IReadinessManager } from '../../readiness/types';

jest.mock('../submitters/submitterManager', () => {
  return {
    submitterManagerFactory: syncTaskFactory
  };
});

const paramsMock = {
  platform: {
    getEventSource: jest.fn(() => { return () => { }; }),
    EventEmitter
  },
  settings: fullSettings,
  storage: {},
  readiness: {},
  start: jest.fn()
};

const ALWAYS_ON_SPLIT = '{"trafficTypeName":"user","name":"always-on","trafficAllocation":100,"trafficAllocationSeed":1012950810,"seed":-725161385,"status":"ACTIVE","killed":false,"defaultTreatment":"off","changeNumber":1494364996459,"algo":2,"conditions":[{"conditionType":"ROLLOUT","matcherGroup":{"combiner":"AND","matchers":[{"keySelector":{"trafficType":"user","attribute":null},"matcherType":"ALL_KEYS","negate":false,"userDefinedSegmentMatcherData":null,"whitelistMatcherData":null,"unaryNumericMatcherData":null,"betweenMatcherData":null}]},"partitions":[{"treatment":"on","size":100},{"treatment":"off","size":0}],"label":"in segment all"}]}';
const ALWAYS_OFF_SPLIT = '{"trafficTypeName":"user","name":"always-off","trafficAllocation":100,"trafficAllocationSeed":-331690370,"seed":403891040,"status":"ACTIVE","killed":false,"defaultTreatment":"on","changeNumber":1494365020316,"algo":2,"conditions":[{"conditionType":"ROLLOUT","matcherGroup":{"combiner":"AND","matchers":[{"keySelector":{"trafficType":"user","attribute":null},"matcherType":"ALL_KEYS","negate":false,"userDefinedSegmentMatcherData":null,"whitelistMatcherData":null,"unaryNumericMatcherData":null,"betweenMatcherData":null}]},"partitions":[{"treatment":"on","size":0},{"treatment":"off","size":100}],"label":"in segment all"}]}';

const STORED_SPLITS: Record<string, string> = {};
STORED_SPLITS['always-on'] = ALWAYS_ON_SPLIT;
STORED_SPLITS['always-off'] = ALWAYS_OFF_SPLIT;

// Mocked storageManager
const storageManagerMock = {
  splits: {
    getSplit: (name: string) => STORED_SPLITS[name],
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
  add: jest.fn(()=>{return {isrunning: () => true};}),
  get: jest.fn()
};

// Mocked pushManager
const pushManagerMock = pushManagerFactory({ // @ts-ignore
  ...paramsMock, splitApi: { fetchAuth: jest.fn() }
}, {}) as IPushManager;

pushManagerMock.start = jest.fn();

test('syncManagerOnline should start or not the submitter depending on user consent status', () => {
  const settings = { ...fullSettings };

  // @ts-ignore
  const syncManager = syncManagerOnlineFactory()({ settings });
  const submitter = syncManager.submitter!;

  syncManager.start();
  expect(submitter.start).toBeCalledTimes(1); // Submitter should be started if userConsent is undefined
  syncManager.stop();
  expect(submitter.stop).toBeCalledTimes(1);

  settings.userConsent = 'UNKNOWN';
  syncManager.start();
  expect(submitter.start).toBeCalledTimes(1); // Submitter should not be started if userConsent is unknown
  syncManager.stop();
  expect(submitter.stop).toBeCalledTimes(2);

  settings.userConsent = 'GRANTED';
  syncManager.start();
  expect(submitter.start).toBeCalledTimes(2); // Submitter should be started if userConsent is granted
  syncManager.stop();
  expect(submitter.stop).toBeCalledTimes(3);

  settings.userConsent = 'DECLINED';
  syncManager.start();
  expect(submitter.start).toBeCalledTimes(2); // Submitter should not be started if userConsent is declined
  syncManager.stop();
  expect(submitter.stop).toBeCalledTimes(4);

});

test('syncManagerOnline should syncAll a single time in singleSync mode', () => {
  const settings = { ...fullSettings };

  // Enable single sync
  settings.sync.singleSync = true;

  // @ts-ignore
  const pollingSyncManager = syncManagerOnlineFactory(() => pollingManagerMock)({ settings });

  expect(pollingSyncManager.pushManager).toBeUndefined();

  // Test pollingManager for Main client
  pollingSyncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.syncAll).toBeCalledTimes(1);

  pollingSyncManager.stop();
  pollingSyncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.syncAll).toBeCalledTimes(1);

  pollingSyncManager.stop();
  pollingSyncManager.start();

  expect(pollingManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.syncAll).toBeCalledTimes(1);

  pollingSyncManager.stop();

  // @ts-ignore
  // Test pollingManager for shared client
  const pollingSyncManagerShared = pollingSyncManager.shared('sharedKey', readinessManagerMock, storageManagerMock);

  if (!pollingSyncManagerShared) throw new Error('pollingSyncManagerShared should exist');

  pollingSyncManagerShared.start();

  expect(pollingManagerMock.start).not.toBeCalled();

  pollingSyncManagerShared.stop();
  pollingSyncManagerShared.start();

  expect(pollingManagerMock.start).not.toBeCalled();

  pollingSyncManagerShared.stop();

  // @ts-ignore
  // Test pushManager for main client
  const pushingSyncManager = syncManagerOnlineFactory(() => pollingManagerMock, () => pushManagerMock)({ settings });

  pushingSyncManager.start();

  expect(pushManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.start).not.toBeCalled();

  pushingSyncManager.stop();
  pushingSyncManager.start();

  expect(pushManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.start).not.toBeCalled();

  pushingSyncManager.stop();

  // @ts-ignore
  // Test pollingManager for shared client
  const pushingSyncManagerShared = pushingSyncManager.shared('pushingSharedKey', readinessManagerMock, storageManagerMock);

  if (!pushingSyncManagerShared) throw new Error('pushingSyncManagerShared should exist');

  pushingSyncManagerShared.start();

  expect(pushManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.start).not.toBeCalled();

  pushingSyncManagerShared.stop();
  pushingSyncManagerShared.start();

  expect(pushManagerMock.start).not.toBeCalled();
  expect(pollingManagerMock.start).not.toBeCalled();

  pushingSyncManagerShared.stop();

  settings.sync.singleSync = false;
  // @ts-ignore
  // pushManager instantiation control test
  const testSyncManager = syncManagerOnlineFactory(() => pollingManagerMock, () => pushManagerMock)({ settings });

  expect(testSyncManager.pushManager).not.toBeUndefined();

  // Test pollingManager for Main client
  testSyncManager.start();

  expect(pushManagerMock.start).toBeCalled();

  testSyncManager.stop();

});
