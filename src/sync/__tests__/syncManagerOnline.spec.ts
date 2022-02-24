import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { syncTaskFactory } from './syncTask.mock';

jest.mock('../submitters/submitterManager', () => {
  return {
    submitterManagerFactory: syncTaskFactory
  };
});

import { syncManagerOnlineFactory } from '../syncManagerOnline';

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
