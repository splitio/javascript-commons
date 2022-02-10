import { EventEmitter } from '../../../utils/MinEvents';
import { fullSettings, fullSettingsServerSide } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { IPushManagerCS } from '../types';
import { syncTaskFactory } from '../../__tests__/syncTask.mock';

// Test target
import { pushManagerFactory } from '../pushManager';

const platformMock = {
  getEventSource: jest.fn(() => { return () => { }; }),
  EventEmitter
};

test('pushManagerFactory returns undefined if EventSource is not available', () => {
  // @ts-ignore
  const pushManager = pushManagerFactory({}, {}, {}, () => { }, {
    getEventSource: () => undefined,
    EventEmitter
  }, fullSettings);

  expect(pushManager).toBe(undefined);
});

describe('pushManager in client-side', () => {

  test('does not connect to streaming if it is stopped inmediatelly after being started', async () => {
    const fetchAuthMock = jest.fn();

    // @ts-ignore
    const pushManager = pushManagerFactory({}, {}, {}, fetchAuthMock, platformMock, fullSettings) as IPushManagerCS;

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

    // @TODO assert log messages
    const fetchAuthMock = jest.fn(() => Promise.reject({ message: 'error' }));

    // @ts-ignore
    const pushManager = pushManagerFactory({}, {}, {}, fetchAuthMock, platformMock, {
      ...fullSettings,
      scheduler: {
        ...fullSettings.scheduler,
        pushRetryBackoffBase: 10 // high authentication backoff
      }
    }) as IPushManagerCS;

    // calling start multiple times has no effect (authenticates only once)
    pushManager.start();
    pushManager.start();

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
    pushManager.stop();
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

  test('does not connect to streaming if it is stopped inmediatelly after being started', async () => {
    const fetchAuthMock = jest.fn();

    // @ts-ignore
    const pushManager = pushManagerFactory({}, {}, {}, fetchAuthMock, platformMock, fullSettingsServerSide) as IPushManagerCS;

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

    // @ts-ignore
    const pushManager = pushManagerFactory({}, {}, {}, fetchAuthMock, platformMock, {
      ...fullSettingsServerSide,
      scheduler: {
        ...fullSettingsServerSide.scheduler,
        pushRetryBackoffBase: 10 // high authentication backoff
      }
    }) as IPushManagerCS;

    // calling start multiple times has no effect (authenticates asynchronously only once)
    pushManager.start();
    pushManager.start();
    expect(fetchAuthMock).toHaveBeenCalledTimes(0);
    await new Promise(res => setTimeout(res));
    expect(fetchAuthMock).toHaveBeenLastCalledWith(undefined);

    // pausing
    pushManager.stop();
    pushManager.stop();
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
