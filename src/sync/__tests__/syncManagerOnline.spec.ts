import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { syncTaskFactory } from './syncTask.mock';
import { syncManagerOnlineFactory } from '../syncManagerOnline';
import { pushManagerFactory } from '../streaming/pushManager';
import { IPushManager } from '../streaming/types';
import { EventEmitter } from '../../utils/MinEvents';

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

  settings.sync.singleSync = true;

  const pollingManager = {
    syncAll: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn()
  };

  const fetchAuthMock = jest.fn();

  // @ts-ignore
  const pollingSyncManager = syncManagerOnlineFactory(() => pollingManager)({ settings });

  pollingSyncManager.start();

  expect(pollingManager.start).not.toBeCalled();
  expect(pollingManager.syncAll).toBeCalledTimes(1);

  pollingSyncManager.stop();

  const pushManager = pushManagerFactory({ // @ts-ignore
    ...paramsMock, splitApi: { fetchAuth: fetchAuthMock }
  }, {}) as IPushManager;

  pushManager.start = jest.fn();

  // @ts-ignore
  const pushingSyncManager = syncManagerOnlineFactory(() => pollingManager, () => pushManager)({ settings });

  pushingSyncManager.start();

  expect(pushManager.start).not.toBeCalled();
  expect(pollingManager.start).not.toBeCalled();

  pushingSyncManager.stop();

});
