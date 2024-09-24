import { impressionsSubmitterFactory } from '../impressionsSubmitter';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { ImpressionsCacheInMemory } from '../../../storages/inMemory/ImpressionsCacheInMemory';

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

describe('Impressions submitter', () => {

  const impressionsCacheInMemory = new ImpressionsCacheInMemory();
  const params: any = {
    settings: { log: loggerMock, scheduler: { impressionsRefreshRate: 100 }, core: {} },
    storage: { impressions: impressionsCacheInMemory },
    splitApi: { postTestImpressionsBulk: jest.fn(() => Promise.resolve()) },
  };

  beforeEach(() => {
    params.splitApi.postTestImpressionsBulk.mockClear();
  });

  test('doesn\'t drop items from cache when POST is resolved', (done) => {
    const impressionsSubmitter = impressionsSubmitterFactory(params);
    impressionsCacheInMemory.track([imp1]);
    impressionsSubmitter.start();

    // Tracking impression when POST is pending
    impressionsCacheInMemory.track([imp2]);
    // Tracking impression after POST is resolved
    setTimeout(() => { impressionsCacheInMemory.track([imp3]); });

    setTimeout(() => {
      expect(params.splitApi.postTestImpressionsBulk.mock.calls).toEqual([
        // POST with imp1
        ['[{"f":"someFeature","i":[{"k":"k1","t":"someTreatment","m":0,"c":123}]}]'],
        // POST with imp2 and imp3
        ['[{"f":"someFeature","i":[{"k":"k2","t":"someTreatment","m":0,"c":123},{"k":"k3","t":"someTreatment","m":0,"c":123}]}]']]);
      impressionsSubmitter.stop();

      done();
    }, params.settings.scheduler.impressionsRefreshRate + 10);
  });

  test('in case of retry, pop new items from cache to include in the POST payload', (done) => {
    // Make the POST request fail
    params.splitApi.postTestImpressionsBulk.mockImplementation(() => Promise.reject());

    const impressionsSubmitter = impressionsSubmitterFactory(params);
    impressionsCacheInMemory.track([imp1]);
    impressionsSubmitter.start();

    // Tracking impression when POST is pending
    impressionsCacheInMemory.track([imp2]);
    // Tracking impression after POST is rejected
    setTimeout(() => { impressionsCacheInMemory.track([imp3]); });

    setTimeout(() => {
      expect(params.splitApi.postTestImpressionsBulk.mock.calls).toEqual([
        // impression for imp1
        ['[{"f":"someFeature","i":[{"k":"k1","t":"someTreatment","m":0,"c":123}]}]'],
        // impressions for imp1, imp2 and imp3
        ['[{"f":"someFeature","i":[{"k":"k1","t":"someTreatment","m":0,"c":123},{"k":"k2","t":"someTreatment","m":0,"c":123},{"k":"k3","t":"someTreatment","m":0,"c":123}]}]']]);
      impressionsSubmitter.stop();

      done();
    }, params.settings.scheduler.impressionsRefreshRate + 10);
  });

  test('if it is executed while POST is pending, execution is queued until POST is resolved and not same items are submitted', (done) => {
    params.splitApi.postTestImpressionsBulk.mockImplementation(() => Promise.resolve());

    const impressionsSubmitter = impressionsSubmitterFactory(params);
    impressionsCacheInMemory.track([imp1]);
    impressionsSubmitter.start();

    // Tracking impression and executing submitter while POST is pending
    impressionsCacheInMemory.track([{ ...imp1, keyName: 'k2' }]);
    impressionsSubmitter.execute().then(() => {
      expect(params.splitApi.postTestImpressionsBulk.mock.calls).toEqual([
        // impression for k1
        ['[{"f":"someFeature","i":[{"k":"k1","t":"someTreatment","m":0,"c":123}]}]'],
        // impression for k2
        ['[{"f":"someFeature","i":[{"k":"k2","t":"someTreatment","m":0,"c":123}]}]']]);
      impressionsSubmitter.stop();

      done();
    });

  });

});
