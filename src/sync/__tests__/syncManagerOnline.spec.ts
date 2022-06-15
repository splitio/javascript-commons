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
  const submitterManager = syncManager.submitterManager!;

  syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(1);
  expect(submitterManager.start).lastCalledWith(false); // SubmitterManager should start all submitters, if userConsent is undefined
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(1);

  settings.userConsent = 'UNKNOWN';
  syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(2);
  expect(submitterManager.start).lastCalledWith(true); // SubmitterManager should start only telemetry submitter, if userConsent is unknown
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(2);
  syncManager.flush();
  expect(submitterManager.execute).toBeCalledTimes(1);
  expect(submitterManager.execute).lastCalledWith(true); // SubmitterManager should flush only telemetry, if userConsent is unknown

  settings.userConsent = 'GRANTED';
  syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(3);
  expect(submitterManager.start).lastCalledWith(false); // SubmitterManager should start all submitters, if userConsent is granted
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(3);
  syncManager.flush();
  expect(submitterManager.execute).toBeCalledTimes(2);
  expect(submitterManager.execute).lastCalledWith(false); // SubmitterManager should flush all submitters, if userConsent is granted

  settings.userConsent = 'DECLINED';
  syncManager.start();
  expect(submitterManager.start).toBeCalledTimes(4);
  expect(submitterManager.start).lastCalledWith(true); // SubmitterManager should start only telemetry submitter, if userConsent is declined
  syncManager.stop();
  expect(submitterManager.stop).toBeCalledTimes(4);
  syncManager.flush();
  expect(submitterManager.execute).toBeCalledTimes(3);
  expect(submitterManager.execute).lastCalledWith(true); // SubmitterManager should flush only telemetry, if userConsent is unknown

});
