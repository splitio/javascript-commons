import { uniqueKeysTrackerFactory } from '../uniqueKeysTracker';
import { filterAdapterFactory } from '../adapters/filterAdapter';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { LOG_PREFIX_UNIQUE_KEYS_TRACKER } from '../../logger/constants';

describe('Unique keys tracker', () => {

  const fakeSenderAdapter = {
    recordUniqueKeys: jest.fn(() => {}),
    recordImpressionCounts: jest.fn(() => {})
  };
  
  const fakeFilter = {
    add: jest.fn(() => { return true; }),
    contains: jest.fn(() => { return true; }),
    clear: jest.fn(),
  };
  
  beforeEach(() => {
    fakeSenderAdapter.recordUniqueKeys.mockClear();
  });


  test('Without filter', () => { 
    
    const simpleTracker = uniqueKeysTrackerFactory(loggerMock, fakeSenderAdapter, undefined, 4);
    
    expect(simpleTracker.track('key1', 'feature1')).toBe(true);
    expect(simpleTracker.track('key2', 'feature1')).toBe(true);
    expect(simpleTracker.track('key1', 'feature1')).toBe(false);
    
    expect(simpleTracker.track('key1', 'feature2')).toBe(true);
    expect(simpleTracker.track('key1', 'feature2')).toBe(false);
    expect(simpleTracker.track('key2', 'feature2')).toBe(true);
    
    expect(fakeSenderAdapter.recordUniqueKeys).toBeCalled();
    expect(loggerMock.warn).toBeCalledWith(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The UniqueKeysTracker size reached the maximum limit`);
    
  });
  
  test('With filter', () => { 
    
    const simpleTracker = uniqueKeysTrackerFactory(loggerMock, fakeSenderAdapter, filterAdapterFactory(fakeFilter), 4);
    
    expect(simpleTracker.track('key1', 'feature1')).toBe(true);
    expect(simpleTracker.track('key2', 'feature1')).toBe(true);
    expect(simpleTracker.track('key1', 'feature2')).toBe(true);
    fakeFilter.add = jest.fn(() => { return false; });
    expect(simpleTracker.track('key1', 'feature1')).toBe(false);
    expect(simpleTracker.track('key1', 'feature2')).toBe(false);
    
    expect(fakeSenderAdapter.recordUniqueKeys).not.toBeCalled();
    
    fakeFilter.add = jest.fn(() => { return true; });
    expect(simpleTracker.track('key2', 'feature2')).toBe(true);
    
    expect(fakeSenderAdapter.recordUniqueKeys).toBeCalled();
    expect(loggerMock.warn).toBeCalledWith(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The UniqueKeysTracker size reached the maximum limit`);
    
  });
});
