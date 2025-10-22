import { uniqueKeysTrackerFactory } from '../uniqueKeysTracker';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';

describe('Unique keys tracker', () => {

  const fakeUniqueKeysCache = {
    track: jest.fn(),
    pop: jest.fn(),
    isEmpty: jest.fn(),
    clear: jest.fn(),
    setOnFullQueueCb: jest.fn()
  };
  let fakeFilter: any = {
    add: jest.fn(() => { return true; }),
    contains: jest.fn(() => { return true; }),
    clear: jest.fn(),
  };

  test('Should be able to track unique keys', () => {

    const uniqueKeysTracker = uniqueKeysTrackerFactory(loggerMock, fakeUniqueKeysCache, fakeFilter);

    uniqueKeysTracker.track('key1', 'value1');
    expect(fakeFilter.add).toBeCalledWith('key1','value1');
    expect(fakeUniqueKeysCache.track).toBeCalledWith('key1','value1');
    uniqueKeysTracker.track('key1', 'value2');
    uniqueKeysTracker.track('key2', 'value3');
    fakeFilter.add = jest.fn(() => { return false; });
    uniqueKeysTracker.track('key1', 'value1');
    expect(fakeFilter.add).toBeCalledWith('key1','value1');
    uniqueKeysTracker.track('key2', 'value3');
    expect(fakeFilter.add).toBeCalledWith('key2','value3');
    expect(fakeUniqueKeysCache.track).toBeCalledTimes(3);

    fakeFilter.add = jest.fn(() => { return true; });
    uniqueKeysTracker.track('key2', 'value4');
    expect(fakeFilter.add).toBeCalledWith('key2','value4');
    expect(fakeUniqueKeysCache.track).toBeCalledWith('key2','value4');

    uniqueKeysTracker.stop();
  });

  test('Unique keys filter cleaner', (done) => {

    const refreshRate = 500;

    fakeFilter.refreshRate = refreshRate;

    const uniqueKeysTrackerWithRefresh = uniqueKeysTrackerFactory(loggerMock, fakeUniqueKeysCache, fakeFilter);

    uniqueKeysTrackerWithRefresh.start();

    setTimeout(() => {

      expect(fakeFilter.clear).toBeCalledTimes(1);

      setTimeout(() => {

        expect(fakeFilter.clear).toBeCalledTimes(2);
        uniqueKeysTrackerWithRefresh.stop();

        setTimeout(() => {

          expect(fakeFilter.clear).toBeCalledTimes(2);

          uniqueKeysTrackerWithRefresh.stop();
          done();
        }, refreshRate + 30);

      }, refreshRate + 30);

    }, refreshRate + 30);

  });
});
