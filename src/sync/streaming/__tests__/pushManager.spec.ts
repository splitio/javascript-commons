import { EventEmitter } from '../../../utils/MinEvents';
import { fullSettings, fullSettingsServerSide } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { syncTaskFactory } from '../../__tests__/syncTask.mock';

// Test target
import { pushManagerFactory, getDelay } from '../pushManager';
import { IPushManager } from '../types';

const paramsMock = {
  platform: {
    getEventSource: jest.fn(() => { return () => { }; }),
    EventEmitter
  },
  settings: fullSettings,
  storage: {},
  readiness: {}
};

test('pushManagerFactory returns undefined if EventSource is not available', () => {
  const params = {
    ...paramsMock,
    platform: {
      getEventSource: () => undefined,
      EventEmitter
    }
  }; // @ts-ignore
  const pushManagerCS = pushManagerFactory(params, {}); // @ts-ignore
  const pushManagerSS = pushManagerFactory(params, {});

  expect(pushManagerCS).toBe(undefined);
  expect(pushManagerSS).toBe(undefined);
});

describe('pushManager in client-side', () => {

  test('does not connect to streaming if it is stopped immediately after being started', async () => {
    const fetchAuthMock = jest.fn();

    const pushManager = pushManagerFactory({ // @ts-ignore
      ...paramsMock, splitApi: { fetchAuth: fetchAuthMock }
    }, {}) as IPushManager;

    pushManager.start();
    pushManager.start();
    pushManager.stop();
    pushManager.stop();
    pushManager.start();
    pushManager.stop();

    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).not.toBeCalled();
  });

  test('re-authenticates asynchronously when it is resumed and when new users are added', async () => {
    const fetchAuthMock = jest.fn(() => Promise.reject({ message: 'error' }));

    const pushManager = pushManagerFactory({ // @ts-ignore
      ...paramsMock, splitApi: { fetchAuth: fetchAuthMock }, settings: {
        ...fullSettings,
        scheduler: {
          ...fullSettings.scheduler,
          pushRetryBackoffBase: 10 // high authentication backoff
        }
      }
    }, {}) as IPushManager;

    // calling start again has no effect (authenticates asynchronously only once)
    expect(pushManager.isRunning()).toBe(false);
    pushManager.start();
    pushManager.stop();
    pushManager.start();
    pushManager.start();
    expect(pushManager.isRunning()).toBe(true);

    // authenticates asynchronously, only once for both users
    const mySegmentsSyncTask = syncTaskFactory();
    pushManager.add('user2', mySegmentsSyncTask);
    expect(fetchAuthMock).toHaveBeenCalledTimes(0);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenLastCalledWith([fullSettings.core.key, 'user2']);

    // re-authenticates asynchronously due to new users
    pushManager.add('user3', mySegmentsSyncTask);
    pushManager.add('user4', mySegmentsSyncTask);
    expect(fetchAuthMock).toHaveBeenCalledTimes(1);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenLastCalledWith([fullSettings.core.key, 'user2', 'user3', 'user4']);

    // pausing
    expect(pushManager.isRunning()).toBe(true);
    pushManager.stop();
    expect(pushManager.isRunning()).toBe(false);
    pushManager.stop();
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenCalledTimes(2);

    // re-authenticates asynchronously when resuming
    pushManager.start();
    pushManager.start();
    expect(fetchAuthMock).toHaveBeenCalledTimes(2);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenLastCalledWith(['user2', 'user3', 'user4', fullSettings.core.key]);
    expect(fetchAuthMock).toHaveBeenCalledTimes(3);

    // doesn't re-authenticate if a user is removed
    pushManager.remove('user3');
    expect(fetchAuthMock).toHaveBeenCalledTimes(3);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenCalledTimes(3);

    // re-authenticates asynchronously when resuming, considering the updated list of users
    pushManager.stop();
    pushManager.start();
    pushManager.stop();
    pushManager.start();
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenLastCalledWith(['user2', 'user4', fullSettings.core.key]);
    expect(fetchAuthMock).toHaveBeenCalledTimes(4);
    pushManager.stop();
  });
});

describe('pushManager in server-side', () => {

  test('does not connect to streaming if it is stopped immediately after being started', async () => {
    const fetchAuthMock = jest.fn();

    const pushManager = pushManagerFactory({ // @ts-ignore
      ...paramsMock, splitApi: { fetchAuth: fetchAuthMock }, settings: fullSettingsServerSide
    }, {}) as IPushManager;

    pushManager.start();
    pushManager.start();
    pushManager.stop();
    pushManager.stop();
    pushManager.start();
    pushManager.stop();

    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).not.toBeCalled();
  });

  test('re-authenticates asynchronously when it is resumed', async () => {
    const fetchAuthMock = jest.fn(() => Promise.reject({ message: 'error' }));

    const pushManager = pushManagerFactory({ // @ts-ignore
      ...paramsMock, splitApi: { fetchAuth: fetchAuthMock }, settings: {
        ...fullSettingsServerSide,
        scheduler: {
          ...fullSettingsServerSide.scheduler,
          pushRetryBackoffBase: 10 // high authentication backoff
        }
      }
    }, {}) as IPushManager;

    // calling start again has no effect (authenticates asynchronously only once)
    expect(pushManager.isRunning()).toBe(false);
    pushManager.start();
    pushManager.start();
    expect(pushManager.isRunning()).toBe(true);
    // @TODO pausing & resuming synchronously is not working as expected in server-side
    // pushManager.stop();
    // pushManager.start();
    expect(fetchAuthMock).toHaveBeenCalledTimes(0);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenLastCalledWith(undefined);

    // pausing
    expect(pushManager.isRunning()).toBe(true);
    pushManager.stop();
    pushManager.stop();
    expect(pushManager.isRunning()).toBe(false);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenCalledTimes(1);

    // re-authenticates asynchronously when resuming
    pushManager.start();
    pushManager.start();
    expect(fetchAuthMock).toHaveBeenCalledTimes(1);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenCalledTimes(2);

    // re-authenticates asynchronously when stopping/resuming
    pushManager.stop();
    pushManager.stop();
    pushManager.start();
    pushManager.start();
    expect(fetchAuthMock).toHaveBeenCalledTimes(2);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenCalledTimes(3);
    pushManager.stop();
  });

});

test('getDelay', () => {
  expect(getDelay({ i: 300, h: 0, s: 0 }, 'nicolas@split.io')).toBe(241);
  expect(getDelay({ i: 60000, h: 0, s: 1 }, 'emi@split.io')).toBe(14389);
  expect(getDelay({ i: 60000, h: 0, s: 0 }, 'emi@split.io')).toBe(24593);
  expect(getDelay({}, 'emi@split.io')).toBe(24593);
});
