import { uniqueKeysTrackerFactory } from '../uniqueKeysTracker';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { LOG_PREFIX_UNIQUE_KEYS_TRACKER } from '../../logger/constants';

describe('Unique keys tracker', () => {

  const fakeFilter = {
    add: jest.fn(() => { return true; }),
    contains: jest.fn(() => { return true; }),
    clear: jest.fn(),
  };

  test('With filter', () => { 
    
    const simpleTracker = uniqueKeysTrackerFactory(loggerMock, fakeFilter, 4);
    
    simpleTracker.track('feature1', 'key1');
    simpleTracker.track('feature1', 'key2');
    simpleTracker.track('feature2', 'key3');
    fakeFilter.add = jest.fn(() => { return false; });
    simpleTracker.track('feature1', 'key1');
    simpleTracker.track('feature2', 'key3');
    
    fakeFilter.add = jest.fn(() => { return true; });
    simpleTracker.track('feature2', 'key4');
    
    expect(loggerMock.warn).toBeCalledWith(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The UniqueKeysTracker size reached the maximum limit`);
    
  });
});
