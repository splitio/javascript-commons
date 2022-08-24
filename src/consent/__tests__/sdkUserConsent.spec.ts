import { createUserConsentAPI } from '../sdkUserConsent';
import { syncTaskFactory } from '../../sync/__tests__/syncTask.mock';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

test('createUserConsentAPI', () => {
  const settings = { ...fullSettings, userConsent: 'UNKNOWN' };
  const syncManager = { submitterManager: syncTaskFactory() };
  const storage = {
    events: { clear: jest.fn() },
    impressions: { clear: jest.fn() }
  };

  // @ts-ignore
  const props = createUserConsentAPI({ settings, syncManager, storage });

  // getUserConsent returns settings.userConsent
  expect(props.getStatus()).toBe(settings.userConsent);
  expect(props.getStatus()).toBe(props.Status.UNKNOWN);

  // setting user consent to 'GRANTED'
  expect(props.setStatus(true)).toBe(true);
  expect(props.setStatus(true)).toBe(true); // calling again has no affect
  expect(syncManager.submitterManager.start).toBeCalledTimes(1); // submitter resumed
  expect(syncManager.submitterManager.stop).toBeCalledTimes(0);
  expect(props.getStatus()).toBe(props.Status.GRANTED);

  // setting user consent to 'DECLINED'
  expect(props.setStatus(false)).toBe(true);
  expect(props.setStatus(false)).toBe(true); // calling again has no affect
  expect(syncManager.submitterManager.start).toBeCalledTimes(1);
  expect(syncManager.submitterManager.stop).toBeCalledTimes(1); // submitter paused
  expect(props.getStatus()).toBe(props.Status.DECLINED);
  expect(storage.events.clear).toBeCalledTimes(1); // storage tracked data dropped
  expect(storage.impressions.clear).toBeCalledTimes(1);

  // @ts-ignore Invalid values have no effect
  expect(props.setStatus('DECLINED')).toBe(false); // @ts-ignore strings are not valid
  expect(props.setStatus('GRANTED')).toBe(false); // @ts-ignore
  expect(props.setStatus(undefined)).toBe(false); // @ts-ignore
  expect(props.setStatus({})).toBe(false);

  expect(syncManager.submitterManager.start).toBeCalledTimes(1);
  expect(syncManager.submitterManager.stop).toBeCalledTimes(1);
  expect(props.getStatus()).toBe(props.Status.DECLINED);
});
