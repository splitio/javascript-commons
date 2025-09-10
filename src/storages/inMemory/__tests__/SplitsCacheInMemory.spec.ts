import { SplitsCacheInMemory } from '../SplitsCacheInMemory';
import { ISplit } from '../../../dtos/types';
import { splitWithUserTT, splitWithAccountTT, something, somethingElse, featureFlagWithEmptyFS, featureFlagWithoutFS, featureFlagOne, featureFlagTwo, featureFlagThree } from '../../__tests__/testUtils';

test('SPLITS CACHE / In Memory', () => {
  const cache = new SplitsCacheInMemory();

  cache.update([something, somethingElse], [], -1);

  let values = cache.getAll();

  expect(values).toEqual([something, somethingElse]);

  cache.removeSplit(something.name);

  const splits = cache.getSplits([something.name, somethingElse.name]);
  expect(splits[something.name]).toEqual(null);
  expect(splits[somethingElse.name]).toEqual(somethingElse);

  values = cache.getAll();

  expect(values).toEqual([somethingElse]);

  expect(cache.getSplit(something.name)).toEqual(null);
  expect(cache.getSplit(somethingElse.name)).toEqual(somethingElse);

  expect(cache.getChangeNumber()).toBe(-1);
  cache.setChangeNumber(123);
  expect(cache.getChangeNumber()).toBe(123);

});

test('SPLITS CACHE / In Memory / Get Keys', () => {
  const cache = new SplitsCacheInMemory();

  cache.update([something, somethingElse], [], 1);

  const keys = cache.getSplitNames();

  expect(keys.indexOf(something.name) !== -1).toBe(true);
  expect(keys.indexOf(somethingElse.name) !== -1).toBe(true);
});

test('SPLITS CACHE / In Memory / Update Splits', () => {
  const cache = new SplitsCacheInMemory();

  cache.update([something, somethingElse], [], 1);

  cache.update([], [something, somethingElse], 1);

  expect(cache.getSplit(something.name)).toBe(null);
  expect(cache.getSplit(somethingElse.name)).toBe(null);
});

test('SPLITS CACHE / In Memory / trafficTypeExists and ttcache tests', () => {
  const cache = new SplitsCacheInMemory();

  cache.update([
    { ...splitWithUserTT, name: 'split1' },
    { ...splitWithAccountTT, name: 'split2' },
    { ...splitWithUserTT, name: 'split3' },
  ], [], 1);
  cache.addSplit({ ...splitWithUserTT, name: 'split4' });

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('not_existent_tt')).toBe(false);

  cache.removeSplit('split4');

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(true);

  cache.removeSplit('split3');
  cache.removeSplit('split2');

  expect(cache.trafficTypeExists('user_tt')).toBe(true);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.removeSplit('split1');

  expect(cache.trafficTypeExists('user_tt')).toBe(false);
  expect(cache.trafficTypeExists('account_tt')).toBe(false);

  cache.addSplit({ ...splitWithUserTT, name: 'split1' });
  expect(cache.trafficTypeExists('user_tt')).toBe(true);

  cache.addSplit({ ...splitWithAccountTT, name: 'split1' });
  expect(cache.trafficTypeExists('account_tt')).toBe(true);
  expect(cache.trafficTypeExists('user_tt')).toBe(false);

});

test('SPLITS CACHE / In Memory / killLocally', () => {
  const cache = new SplitsCacheInMemory();
  cache.addSplit(something);
  cache.addSplit(somethingElse);
  const initialChangeNumber = cache.getChangeNumber();

  // kill an non-existent split
  let updated = cache.killLocally('nonexistent_split', 'other_treatment', 101);
  const nonexistentSplit = cache.getSplit('nonexistent_split');

  expect(updated).toBe(false); // killLocally resolves without update if split doesn't exist
  expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

  // kill an existent split
  updated = cache.killLocally(something.name, 'some_treatment', 100);
  let lol1Split = cache.getSplit(something.name) as ISplit;

  expect(updated).toBe(true); // killLocally resolves with update if split is changed
  expect(lol1Split.killed).toBe(true); // existing split must be killed
  expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have new default treatment
  expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
  expect(cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

  // not update if changeNumber is old
  updated = cache.killLocally(something.name, 'some_treatment_2', 90);
  lol1Split = cache.getSplit(something.name) as ISplit;

  expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
  expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

});

test('SPLITS CACHE / In Memory / flag set cache tests', () => {
  // @ts-ignore
  const cache = new SplitsCacheInMemory({ groupedFilters: { bySet: ['o', 'n', 'e', 'x'] } });
  const emptySet = new Set([]);

  cache.update([
    featureFlagOne,
    featureFlagTwo,
    featureFlagThree,
  ], [], -1);
  cache.addSplit(featureFlagWithEmptyFS);

  // Adding an existing FF should not affect the cache
  cache.update([featureFlagTwo], [], -1);

  expect(cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
  expect(cache.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
  expect(cache.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
  expect(cache.getNamesByFlagSets(['t'])).toEqual([emptySet]); // 't' not in filter
  expect(cache.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);

  cache.addSplit({ ...featureFlagOne, sets: ['1'] });

  expect(cache.getNamesByFlagSets(['1'])).toEqual([emptySet]); // '1' not in filter
  expect(cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_two'])]);
  expect(cache.getNamesByFlagSets(['n'])).toEqual([emptySet]);

  cache.addSplit({ ...featureFlagOne, sets: ['x'] });
  expect(cache.getNamesByFlagSets(['x'])).toEqual([new Set(['ff_one'])]);
  expect(cache.getNamesByFlagSets(['o', 'e', 'x'])).toEqual([new Set(['ff_two']), new Set(['ff_three']), new Set(['ff_one'])]);


  cache.removeSplit(featureFlagOne.name);
  expect(cache.getNamesByFlagSets(['x'])).toEqual([emptySet]);

  cache.removeSplit(featureFlagOne.name);
  expect(cache.getNamesByFlagSets(['y'])).toEqual([emptySet]); // 'y' not in filter
  expect(cache.getNamesByFlagSets([])).toEqual([]);

  cache.addSplit(featureFlagWithoutFS);
  expect(cache.getNamesByFlagSets([])).toEqual([]);

  cache.clear();
  expect(cache.getNamesByFlagSets(['o', 'e', 'x'])).toEqual([emptySet, emptySet, emptySet]);
});

// if FlagSets are not defined, it should store all FlagSets in memory.
test('SPLITS CACHE / In Memory / flag set cache tests without filters', () => {
  const cacheWithoutFilters = new SplitsCacheInMemory();
  const emptySet = new Set([]);

  cacheWithoutFilters.update([
    featureFlagOne,
    featureFlagTwo,
    featureFlagThree,
  ], [], -1);
  cacheWithoutFilters.addSplit(featureFlagWithEmptyFS);

  expect(cacheWithoutFilters.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['t'])).toEqual([new Set(['ff_two', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['y'])).toEqual([emptySet]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);
});
