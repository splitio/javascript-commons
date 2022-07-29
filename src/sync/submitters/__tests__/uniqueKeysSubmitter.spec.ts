import { uniqueKeysSubmitterFactory } from '../uniqueKeysSubmitter';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { uniqueKeysTrackerFactory } from '../../../trackers/uniqueKeysTracker';

const imp1 = {
  feature: 'someFeature',
  keyName: 'k1',
  changeNumber: 123,
  label: 'someLabel',
  treatment: 'someTreatment',
  time: 0
};
const imp2 = { ...imp1, keyName: 'k2' };
const imp3 = { ...imp1, keyName: 'k3' };

describe('uniqueKeys submitter', () => {

  const uniqueKeysTracker = uniqueKeysTrackerFactory(loggerMock);
  const params: any = {
    settings: { log: loggerMock, scheduler: { uniqueKeysRefreshRate: 200 }, core: {} },
    storage: { uniqueKeys: uniqueKeysTracker },
    splitApi: { postUniqueKeysBulk: jest.fn(() => Promise.resolve()) },
  };

  beforeEach(() => {
    params.splitApi.postUniqueKeysBulk.mockClear();
  });

  test('doesn\'t drop items from cache when POST is resolved', (done) => {
    const uniqueKeysSubmitter = uniqueKeysSubmitterFactory(params);
    uniqueKeysTracker.track(imp1.feature, imp1.keyName);
    uniqueKeysSubmitter.start();

    // Tracking unique keys when POST is pending
    uniqueKeysTracker.track(imp2.feature, imp2.keyName);
    // Tracking unique keys after POST is resolved
    setTimeout(() => { uniqueKeysTracker.track(imp3.feature, imp3.keyName); });

    setTimeout(() => {
      expect(params.splitApi.postUniqueKeysBulk.mock.calls).toEqual([
        // POST with imp1
        ['[{"f":"someFeature","k":["k1"]}]'],
        // POST with imp2 and imp3
        ['[{"f":"someFeature","k":["k2","k3"]}]']]);
      uniqueKeysSubmitter.stop();

      done();
    }, params.settings.scheduler.uniqueKeysRefreshRate + 10);
  });
  
});
