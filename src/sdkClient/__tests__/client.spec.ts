import { ISettings } from '../../types';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { clientFactory } from '../client';

test('client should track or not events and impressions depending on user consent status', () => {
  const sdkReadinessManager = { readinessManager: { isReady: () => true } };
  const storage = { splits: { trafficTypeExists: () => true } };

  const settings: ISettings = { ...fullSettings, userConsent: undefined };
  const eventTracker = { track: jest.fn() };
  const impressionsTracker = { track: jest.fn() };

  // @ts-ignore
  const client = clientFactory({ settings, eventTracker, impressionsTracker, sdkReadinessManager, storage });

  client.getTreatment('some_key', 'some_split');
  expect(impressionsTracker.track).toBeCalledTimes(1); // impression should be tracked if userConsent is undefined
  client.track('some_key', 'some_tt', 'some_event');
  expect(eventTracker.track).toBeCalledTimes(1); // event should be tracked if userConsent is undefined

  settings.userConsent = 'unknown';
  client.getTreatment('some_key', 'some_split');
  expect(impressionsTracker.track).toBeCalledTimes(2); // impression should be tracked if userConsent is unknown
  client.track('some_key', 'some_tt', 'some_event');
  expect(eventTracker.track).toBeCalledTimes(2); // event should be tracked if userConsent is unknown

  settings.userConsent = 'granted';
  client.getTreatment('some_key', 'some_split');
  expect(impressionsTracker.track).toBeCalledTimes(3); // impression should be tracked if userConsent is granted
  client.track('some_key', 'some_tt', 'some_event');
  expect(eventTracker.track).toBeCalledTimes(3); // event should be tracked if userConsent is granted

  settings.userConsent = 'declined';
  client.getTreatment('some_key', 'some_split');
  expect(impressionsTracker.track).toBeCalledTimes(3); // impression should not be tracked if userConsent is declined
  client.track('some_key', 'some_tt', 'some_event');
  expect(eventTracker.track).toBeCalledTimes(3); // event should not be tracked if userConsent is declined

});
