import impressionsTrackerFactory from '../impressionsTracker';
import ImpressionCountsCacheInMemory from '../../storages/inMemory/ImpressionCountsCacheInMemory';
import { impressionObserverSSFactory } from '../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../impressionObserver/impressionObserverCS';
import { IMetadata } from '../../dtos/types';
import { ImpressionDTO } from '../../types';

/* Mocks */

function generateMocks() {
  const fakeImpressionsCache = {
    track: jest.fn()
  };
  const fakeMetadata: IMetadata = {
    hostname: 'fake-hostname',
    ip: 'fake-ip',
    version: 'jest-test',
  };
  const fakeListener = {
    logImpression: jest.fn()
  };
  const fakeIntegrationsManager = {
    handleImpression: jest.fn()
  };

  return {
    fakeImpressionsCache, fakeMetadata, fakeListener, fakeIntegrationsManager
  };
}

/* Tests */

describe('Impressions Tracker', () => {

  test('Tracker API', () => {
    expect(typeof impressionsTrackerFactory).toBe('function'); // The module should return a function which acts as a factory.

    const { fakeImpressionsCache, fakeMetadata } = generateMocks();
    const instance = impressionsTrackerFactory(fakeImpressionsCache, fakeMetadata);
    expect(typeof instance.track).toBe('function'); // The instance should implement the track method which will actually track queued impressions.
  });

  test('Should be able to track impressions (in DEBUG mode without Previous Time).', () => {
    const { fakeImpressionsCache, fakeMetadata } = generateMocks();
    const tracker = impressionsTrackerFactory(fakeImpressionsCache, fakeMetadata);

    const imp1 = {
      feature: '10',
    } as ImpressionDTO;
    const imp2 = {
      feature: '20',
    } as ImpressionDTO;
    const imp3 = {
      feature: '30',
    } as ImpressionDTO;

    expect(fakeImpressionsCache.track.mock.calls.length).toBe(0); // cache method should not be called by just creating a tracker

    tracker.track([imp1, imp2, imp3]);

    expect(fakeImpressionsCache.track.mock.calls[0][0]).toEqual([imp1, imp2, imp3]); // Should call the storage track method once we invoke .track() method, passing queued params in a sequence.
  });

  test('Tracked impressions should be sent to impression listener and integration manager when we invoke .track()', (done) => {
    const { fakeImpressionsCache, fakeMetadata, fakeListener, fakeIntegrationsManager } = generateMocks();
    const tracker = impressionsTrackerFactory(fakeImpressionsCache, fakeMetadata, fakeListener, fakeIntegrationsManager);

    const fakeImpression = {
      feature: 'impression'
    } as ImpressionDTO;
    const fakeImpression2 = {
      feature: 'impression_2'
    } as ImpressionDTO;
    const fakeAttributes = {
      fake: 'attributes'
    };

    expect(fakeImpressionsCache.track.mock.calls.length).toBe(0); // The storage should not be invoked if we haven't tracked impressions.
    expect(fakeListener.logImpression.mock.calls.length).toBe(0); // The listener should not be invoked if we haven't tracked impressions.
    expect(fakeIntegrationsManager.handleImpression.mock.calls.length).toBe(0); // The integrations manager handleImpression method should not be invoked if we haven't tracked impressions.

    // We signal that we actually want to track the queued impressions.
    tracker.track([fakeImpression, fakeImpression2], fakeAttributes);

    expect(fakeImpressionsCache.track.mock.calls[0][0]).toEqual([fakeImpression, fakeImpression2]); // Even with a listener, impression should be sent to the cache
    expect(fakeListener.logImpression.mock.calls.length).toBe(0); // The listener should not be executed synchronously.
    expect(fakeIntegrationsManager.handleImpression.mock.calls.length).toBe(0); // The integrations manager handleImpression method should not be executed synchronously.

    setTimeout(() => {
      expect(fakeListener.logImpression.mock.calls.length).toBe(2); // The listener should be executed after the timeout wrapping make it to the queue stack, once per each tracked impression.
      expect(fakeIntegrationsManager.handleImpression.mock.calls.length).toBe(2); // The integrations manager handleImpression method should be executed after the timeout wrapping make it to the queue stack, once per each tracked impression.

      const impressionData1 = { impression: fakeImpression, attributes: fakeAttributes, sdkLanguageVersion: fakeMetadata.version, ip: fakeMetadata.ip, hostname: fakeMetadata.hostname };
      const impressionData2 = { impression: fakeImpression2, attributes: fakeAttributes, sdkLanguageVersion: fakeMetadata.version, ip: fakeMetadata.ip, hostname: fakeMetadata.hostname };

      expect(fakeListener.logImpression.mock.calls[0][0]).toEqual(impressionData1); // The listener should be executed with the corresponding map for each of the impressions.
      expect(fakeListener.logImpression.mock.calls[1][0]).toEqual(impressionData2); // The listener should be executed with the corresponding map for each of the impressions.
      expect(fakeListener.logImpression.mock.calls[0][0].impression).not.toBe(fakeImpression); // but impression should be a copy
      expect(fakeListener.logImpression.mock.calls[1][0].impression).not.toBe(fakeImpression2); // but impression should be a copy

      expect(fakeIntegrationsManager.handleImpression.mock.calls[0][0]).toEqual(impressionData1); // The integration manager handleImpression method should be executed with the corresponding map for each of the impressions.
      expect(fakeIntegrationsManager.handleImpression.mock.calls[1][0]).toEqual(impressionData2); // The integration manager handleImpression method should be executed with the corresponding map for each of the impressions.
      expect(fakeIntegrationsManager.handleImpression.mock.calls[0][0].impression).not.toBe(fakeImpression); // but impression should be a copy
      expect(fakeIntegrationsManager.handleImpression.mock.calls[1][0].impression).not.toBe(fakeImpression2); // but impression should be a copy

      done();
    }, 0);
  });

  const impression = {
    feature: 'qc_team',
    keyName: 'marcio@split.io',
    treatment: 'no',
    time: 0,
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  const impression2 = {
    feature: 'qc_team_2',
    keyName: 'marcio@split.io',
    treatment: 'yes',
    time: 0,
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  const impression3 = {
    feature: 'qc_team',
    keyName: 'marcio@split.io',
    treatment: 'no',
    time: 0,
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;

  test('Should track 3 impressions with Previous Time.', () => {
    const { fakeImpressionsCache, fakeMetadata } = generateMocks();
    impression.time = impression2.time = 123456789;
    impression3.time = 1234567891;

    const trackers = [
      impressionsTrackerFactory(fakeImpressionsCache, fakeMetadata, undefined, undefined, impressionObserverSSFactory()),
      impressionsTrackerFactory(fakeImpressionsCache, fakeMetadata, undefined, undefined, impressionObserverCSFactory())
    ];

    expect(fakeImpressionsCache.track.mock.calls.length).toBe(0); // storage method should not be called until impressions are tracked.

    trackers.forEach(tracker => {
      tracker.track([impression, impression2, impression3]);

      const lastArgs = fakeImpressionsCache.track.mock.calls[fakeImpressionsCache.track.mock.calls.length - 1];

      expect(lastArgs.length).toBe(1);
      expect(lastArgs[0].length).toBe(3);
      expect(lastArgs[0][0].pt).toBe(undefined);
      expect(lastArgs[0][0].feature).toBe('qc_team');
      expect(lastArgs[0][1].pt).toBe(undefined);
      expect(lastArgs[0][1].feature).toBe('qc_team_2');
      expect(lastArgs[0][2].pt).toBe(123456789);
      expect(lastArgs[0][2].feature).toBe('qc_team');
    });
  });

  test('Should track 2 impressions in OPTIMIZED mode (providing ImpressionCountsCache).', () => {
    const { fakeImpressionsCache, fakeMetadata } = generateMocks();
    impression.time = Date.now();
    impression2.time = Date.now();
    impression3.time = Date.now();

    const impressionCountsCache = new ImpressionCountsCacheInMemory();
    const tracker = impressionsTrackerFactory(fakeImpressionsCache, fakeMetadata, undefined, undefined, impressionObserverCSFactory(), impressionCountsCache);

    expect(fakeImpressionsCache.track.mock.calls.length).toBe(0); // cache method should not be called by just creating a tracker

    tracker.track([impression, impression2, impression3]);

    const lastArgs = fakeImpressionsCache.track.mock.calls[fakeImpressionsCache.track.mock.calls.length - 1];

    expect(lastArgs.length).toBe(1);
    expect(lastArgs[0].length).toBe(2);
    expect(lastArgs[0][0].pt).toBe(undefined);
    expect(lastArgs[0][0].feature).toBe('qc_team');
    expect(lastArgs[0][1].pt).toBe(undefined);
    expect(lastArgs[0][1].feature).toBe('qc_team_2');

    expect(Object.keys(impressionCountsCache.state()).length).toBe(2);
  });

});
