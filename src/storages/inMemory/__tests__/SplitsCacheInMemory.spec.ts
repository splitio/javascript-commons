import { SplitsCacheInMemory } from '../SplitsCacheInMemory';
import { ISplit } from '../../../dtos/types';
import { splitWithUserTT, splitWithAccountTT, something, somethingElse, featureFlagWithEmptyFS, featureFlagWithoutFS, featureFlagOne, featureFlagTwo, featureFlagThree } from '../../__tests__/testUtils';
import { _Set } from '../../../utils/lang/sets';

test('SPLITS CACHE / In Memory', () => {
  const cache = new SplitsCacheInMemory();

  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);

  let values = cache.getAll();

  expect(values.indexOf(something) !== -1).toBe(true);
  expect(values.indexOf(somethingElse) !== -1).toBe(true);

  cache.removeSplit('lol1');

  const splits = cache.getSplits(['lol1', 'lol2']);
  expect(splits['lol1'] === null).toBe(true);
  expect(splits['lol2'] === somethingElse).toBe(true);

  values = cache.getAll();

  expect(values.indexOf(something) === -1).toBe(true);
  expect(values.indexOf(somethingElse) !== -1).toBe(true);

  expect(cache.getSplit('lol1') == null).toBe(true);
  expect(cache.getSplit('lol2') === somethingElse).toBe(true);

  cache.setChangeNumber(123);
  expect(cache.getChangeNumber() === 123).toBe(true);

});

test('SPLITS CACHE / In Memory / Get Keys', () => {
  const cache = new SplitsCacheInMemory();

  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);

  let keys = cache.getSplitNames();

  expect(keys.indexOf('lol1') !== -1).toBe(true);
  expect(keys.indexOf('lol2') !== -1).toBe(true);
});

test('SPLITS CACHE / In Memory / trafficTypeExists and ttcache tests', () => {
  const cache = new SplitsCacheInMemory();

  cache.addSplits([ // loop of addSplit
    ['split1', splitWithUserTT],
    ['split2', splitWithAccountTT],
    ['split3', splitWithUserTT],
  ]);
  cache.addSplit('split4', splitWithUserTT);

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('not_existent_tt')).toBe(false);

  cache.removeSplit('split4');

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);

  cache.removeSplits(['split3', 'split2']); // it'll invoke a loop of removeSplit

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.removeSplit('split1');

  expect(cache.trafficTypeExists('user_tt')).toBe(false);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.addSplit('split1', splitWithUserTT);
  expect(cache.trafficTypeExists('user_tt')).toBe(true);

  cache.addSplit('split1', splitWithAccountTT);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('user_tt')).toBe(false);

});

test('SPLITS CACHE / In Memory / killLocally', () => {
  const cache = new SplitsCacheInMemory();
  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);
  const initialChangeNumber = cache.getChangeNumber();

  // kill an non-existent split
  let updated = cache.killLocally('nonexistent_split', 'other_treatment', 101);
  const nonexistentSplit = cache.getSplit('nonexistent_split');

  expect(updated).toBe(false); // killLocally resolves without update if split doesn\'t exist
  expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

  // kill an existent split
  updated = cache.killLocally('lol1', 'some_treatment', 100);
  let lol1Split = cache.getSplit('lol1') as ISplit;

  expect(updated).toBe(true); // killLocally resolves with update if split is changed
  expect(lol1Split.killed).toBe(true); // existing split must be killed
  expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have the given default treatment
  expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
  expect(cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

  // not update if changeNumber is old
  updated = cache.killLocally('lol1', 'some_treatment_2', 90);
  lol1Split = cache.getSplit('lol1') as ISplit;

  expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
  expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

});

test('SPLITS CACHE / In Memory / flag set cache tests', () => {
  // @ts-ignore
  const cache = new SplitsCacheInMemory({ groupedFilters: { bySet: ['o', 'n', 'e', 'x'] } });
  const emptySet = new _Set([]);

  cache.addSplits([
    [featureFlagOne.name, featureFlagOne],
    [featureFlagTwo.name, featureFlagTwo],
    [featureFlagThree.name, featureFlagThree],
  ]);
  cache.addSplit(featureFlagWithEmptyFS.name, featureFlagWithEmptyFS);

  expect(cache.getNamesByFlagSets(['o'])).toEqual([new _Set(['ff_one', 'ff_two'])]);
  expect(cache.getNamesByFlagSets(['n'])).toEqual([new _Set(['ff_one'])]);
  expect(cache.getNamesByFlagSets(['e'])).toEqual([new _Set(['ff_one', 'ff_three'])]);
  expect(cache.getNamesByFlagSets(['t'])).toEqual([emptySet]); // 't' not in filter
  expect(cache.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new _Set(['ff_one', 'ff_two']), new _Set(['ff_one']), new _Set(['ff_one', 'ff_three'])]);

  cache.addSplit(featureFlagOne.name, { ...featureFlagOne, sets: ['1'] });

  expect(cache.getNamesByFlagSets(['1'])).toEqual([emptySet]); // '1' not in filter
  expect(cache.getNamesByFlagSets(['o'])).toEqual([new _Set(['ff_two'])]);
  expect(cache.getNamesByFlagSets(['n'])).toEqual([emptySet]);

  cache.addSplit(featureFlagOne.name, { ...featureFlagOne, sets: ['x'] });
  expect(cache.getNamesByFlagSets(['x'])).toEqual([new _Set(['ff_one'])]);
  expect(cache.getNamesByFlagSets(['o', 'e', 'x'])).toEqual([new _Set(['ff_two']), new _Set(['ff_three']), new _Set(['ff_one'])]);


  cache.removeSplit(featureFlagOne.name);
  expect(cache.getNamesByFlagSets(['x'])).toEqual([emptySet]);

  cache.removeSplit(featureFlagOne.name);
  expect(cache.getNamesByFlagSets(['y'])).toEqual([emptySet]); // 'y' not in filter
  expect(cache.getNamesByFlagSets([])).toEqual([]);

  cache.addSplit(featureFlagWithEmptyFS.name, featureFlagWithoutFS);
  expect(cache.getNamesByFlagSets([])).toEqual([]);
});

// if FlagSets are not defined, it should store all FlagSets in memory.
test('SPLIT CACHE / LocalStorage / flag set cache tests without filters', () => {
  const cacheWithoutFilters = new SplitsCacheInMemory();
  const emptySet = new _Set([]);

  cacheWithoutFilters.addSplits([
    [featureFlagOne.name, featureFlagOne],
    [featureFlagTwo.name, featureFlagTwo],
    [featureFlagThree.name, featureFlagThree],
  ]);
  cacheWithoutFilters.addSplit(featureFlagWithEmptyFS.name, featureFlagWithEmptyFS);

  expect(cacheWithoutFilters.getNamesByFlagSets(['o'])).toEqual([new _Set(['ff_one', 'ff_two'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['n'])).toEqual([new _Set(['ff_one'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['e'])).toEqual([new _Set(['ff_one', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['t'])).toEqual([new _Set(['ff_two', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['y'])).toEqual([emptySet]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new _Set(['ff_one', 'ff_two']), new _Set(['ff_one']), new _Set(['ff_one', 'ff_three'])]);
});
