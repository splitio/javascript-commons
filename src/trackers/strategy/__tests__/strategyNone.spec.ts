import { ImpressionCountsCacheInMemory } from '../../../storages/inMemory/ImpressionCountsCacheInMemory';
import { UniqueKeysCacheInMemory } from '../../../storages/inMemory/uniqueKeysCacheInMemory';
import { strategyNoneFactory } from '../strategyNone';
import { uniqueKeysTrackerFactory } from '../../uniqueKeysTracker';
import { impression1, impression2 } from './testUtils';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { UniqueKeysCacheInMemoryCS } from '../../../storages/inMemory/uniqueKeysCacheInMemoryCS';

const fakeFilter = {
  add: jest.fn(() => { return true; }),
  contains: jest.fn(() => { return true; }),
  clear: jest.fn(),
};

let impressions = [
  impression1,
  impression2,
  {...impression1, keyName: 'emma@split.io'},
  {...impression1, keyName: 'nico@split.io'},
  {...impression1, keyName: 'emi@split.io'},
  {...impression1, keyName: 'emi@split.io'}
];

test('strategyNone - Client side', () => {
  const impressionCountsCache = new ImpressionCountsCacheInMemory();
  const uniqueKeysCacheCS = new UniqueKeysCacheInMemoryCS(6);
  const uniqueKeysTracker = uniqueKeysTrackerFactory(loggerMock, uniqueKeysCacheCS, fakeFilter);
  
  const strategyNone = strategyNoneFactory(impressionCountsCache, uniqueKeysTracker);
  
  const { 
    impressionsToStore: impressionsToStoreCs, 
    impressionsToListener: impressionsToListenerCs, 
    deduped: dedupedCs 
  } = strategyNone.process(impressions);
  
  expect(uniqueKeysCacheCS.pop()).toStrictEqual({
    keys: [
      {
        k: 'emma@split.io',
        fs: ['qc_team', 'qc_team_2'],
      },
      {
        k: 'nico@split.io',
        fs:  ['qc_team'],
      },
      {
        k: 'emi@split.io',
        fs:  ['qc_team'],
      }
    ]
  });

  expect(uniqueKeysCacheCS.pop()).toStrictEqual({ keys: [] });
  
  expect(impressionsToStoreCs).toStrictEqual([]);
  expect(impressionsToListenerCs).toStrictEqual(impressions);
  expect(dedupedCs).toStrictEqual(0);

});

test('strategyNone - Server side', () => {

  const impressionCountsCache = new ImpressionCountsCacheInMemory();
  const uniqueKeysCache = new UniqueKeysCacheInMemory(6);
  const uniqueKeysTracker = uniqueKeysTrackerFactory(loggerMock, uniqueKeysCache, fakeFilter);
  
  const strategyNone = strategyNoneFactory(impressionCountsCache, uniqueKeysTracker);
  
  const { 
    impressionsToStore: impressionsToStoreSs, 
    impressionsToListener: impressionsToListenerSs, 
    deduped: dedupedSs 
  } = strategyNone.process(impressions);
  
  expect(uniqueKeysCache.pop()).toStrictEqual({
    keys: [
      {
        f: 'qc_team',
        ks: [
          'emma@split.io',
          'nico@split.io',
          'emi@split.io',
        ],
      },
      {
        f: 'qc_team_2',
        ks: ['emma@split.io']
      }
    ]
  });
  expect(uniqueKeysCache.pop()).toStrictEqual({ keys: [] });
  
  expect(impressionsToStoreSs).toStrictEqual([]);
  expect(impressionsToListenerSs).toStrictEqual(impressions);
  expect(dedupedSs).toStrictEqual(0);
  
});
