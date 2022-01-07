import { pushManagerFactory } from '../pushManager';
import { EventEmitter } from '../../../utils/MinEvents';
import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { IPushManagerCS } from '../types';

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

test('pushManager does not connect to streaming if it is stopped inmediatelly after being started', (done) => {
  const fetchAuthMock = jest.fn();

  // @ts-ignore
  const pushManager = pushManagerFactory({}, {}, {}, fetchAuthMock, platformMock, fullSettings) as IPushManagerCS;

  pushManager.start();
  pushManager.start();
  pushManager.stop();
  pushManager.stop();

  setTimeout(() => {
    expect(fetchAuthMock).not.toBeCalled();
    done();
  });
});
