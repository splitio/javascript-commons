import { ImpressionCountsCacheInMemory } from '../../../storages/inMemory/ImpressionCountsCacheInMemory';
import { UniqueKeysCacheInMemory } from '../../../storages/inMemory/uniqueKeysCacheInMemory';
import { strategyNoneFactory } from '../strategyNone';
import { uniqueKeysTrackerFactory } from '../../uniqueKeysTracker';
import { getExpected, impression1, impression2, processStrategy } from './testUtils';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

const fakeFilter = {
  add: jest.fn(() => { return true; }),
  contains: jest.fn(() => { return true; }),
  clear: jest.fn(),
};

test('strategyNone', () => {
  const impressionCountsCache = new ImpressionCountsCacheInMemory();
  const uniqueKeysCache = new UniqueKeysCacheInMemory(6);
  const uniqueKeysTracker = uniqueKeysTrackerFactory(loggerMock, uniqueKeysCache, fakeFilter);
  
  let impressions = [
    impression1, 
    impression2, 
    {...impression1, keyName: 'emma@split.io'}, 
    {...impression1, keyName: 'nico@split.io'}, 
    {...impression1, keyName: 'emi@split.io'}, 
    {...impression1, keyName: 'emi@split.io'}
  ];
  
  const strategyNone = strategyNoneFactory(impressionCountsCache, uniqueKeysTracker);
  let clientSide = true;
  const { 
    impressionsToStore: impressionsToStoreCs, 
    impressionsToListener: impressionsToListenerCs, 
    deduped: dedupedCs 
  } = processStrategy(strategyNone, impressions, clientSide);
  
  expect(uniqueKeysCache.pop()).toStrictEqual(getExpected(impressions, clientSide));
  expect(uniqueKeysCache.pop()).toStrictEqual({});
  
  expect(impressionsToStoreCs).toStrictEqual([]);
  expect(impressionsToListenerCs).toStrictEqual(impressions);
  expect(dedupedCs).toStrictEqual(0);
  
  clientSide = false;
  
  const { 
    impressionsToStore: impressionsToStoreSs, 
    impressionsToListener: impressionsToListenerSs, 
    deduped: dedupedSs 
  } = processStrategy(strategyNone, impressions, clientSide);
  
  expect(uniqueKeysCache.pop()).toStrictEqual(getExpected(impressions, clientSide));
  expect(uniqueKeysCache.pop()).toStrictEqual({});
  
  expect(impressionsToStoreSs).toStrictEqual([]);
  expect(impressionsToListenerSs).toStrictEqual(impressions);
  expect(dedupedSs).toStrictEqual(0);
  
});
