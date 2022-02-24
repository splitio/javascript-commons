import { userConsentProps } from '../userConsentProps';
import { syncTaskFactory } from '../../sync/__tests__/syncTask.mock';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

test('userConsentProps', () => {
  const settings = { ...fullSettings };
  const syncManager = { submitter: syncTaskFactory() };

  // @ts-ignore
  const props = userConsentProps(settings, syncManager);

  // getUserConsent returns settings.userConsent
  expect(props.getUserConsent()).toBe(settings.userConsent);

  // setting user consent to 'granted'
  expect(props.setUserConsent(true)).toBe(true);
  expect(props.setUserConsent(true)).toBe(true); // calling again has no affect
  expect(syncManager.submitter.start).toBeCalledTimes(1); // submitter resumed
  expect(syncManager.submitter.stop).toBeCalledTimes(0);
  expect(props.getUserConsent()).toBe('granted');

  // setting user consent to 'declined'
  expect(props.setUserConsent(false)).toBe(true);
  expect(props.setUserConsent(false)).toBe(true); // calling again has no affect
  expect(syncManager.submitter.start).toBeCalledTimes(1);
  expect(syncManager.submitter.stop).toBeCalledTimes(1); // submitter paused
  expect(props.getUserConsent()).toBe('declined');

  // Invalid values have no effect
  expect(props.setUserConsent('declined')).toBe(false); // strings are not valid
  expect(props.setUserConsent('granted')).toBe(false);
  expect(props.setUserConsent(undefined)).toBe(false);
  expect(props.setUserConsent({})).toBe(false);

  expect(syncManager.submitter.start).toBeCalledTimes(1);
  expect(syncManager.submitter.stop).toBeCalledTimes(1);
  expect(props.getUserConsent()).toBe('declined');

});
