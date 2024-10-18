import { SplitsCacheInLocal } from '../SplitsCacheInLocal';
import { KeyBuilderCS } from '../../KeyBuilderCS';
import { splitWithUserTT, splitWithAccountTT, splitWithAccountTTAndUsesSegments, something, somethingElse, featureFlagOne, featureFlagTwo, featureFlagThree, featureFlagWithEmptyFS, featureFlagWithoutFS } from '../../__tests__/testUtils';
import { ISplit } from '../../../dtos/types';
import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';


test('SPLIT CACHE / LocalStorage', () => {
  const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));

  cache.clear();

  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);

  let values = cache.getAll();

  expect(values).toEqual([something, somethingElse]);

  cache.removeSplit('lol1');

  const splits = cache.getSplits(['lol1', 'lol2']);
  expect(splits['lol1']).toEqual(null);
  expect(splits['lol2']).toEqual(somethingElse);

  values = cache.getAll();

  expect(values).toEqual([somethingElse]);

  expect(cache.getSplit('lol1')).toEqual(null);
  expect(cache.getSplit('lol2')).toEqual(somethingElse);

  expect(cache.checkCache()).toBe(false); // checkCache should return false until localstorage has data.

  expect(cache.getChangeNumber() === -1).toBe(true);

  expect(cache.checkCache()).toBe(false); // checkCache should return false until localstorage has data.

  cache.setChangeNumber(123);

  expect(cache.checkCache()).toBe(true); // checkCache should return true once localstorage has data.

  expect(cache.getChangeNumber() === 123).toBe(true);

});

test('SPLIT CACHE / LocalStorage / Get Keys', () => {
  const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));

  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);

  const keys = cache.getSplitNames();

  expect(keys.indexOf('lol1') !== -1).toBe(true);
  expect(keys.indexOf('lol2') !== -1).toBe(true);
});

test('SPLIT CACHE / LocalStorage / Add Splits', () => {
  const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));

  cache.addSplits([
    ['lol1', something],
    ['lol2', somethingElse]
  ]);

  cache.removeSplits(['lol1', 'lol2']);

  expect(cache.getSplit('lol1') == null).toBe(true);
  expect(cache.getSplit('lol2') == null).toBe(true);
});

test('SPLIT CACHE / LocalStorage / trafficTypeExists and ttcache tests', () => {
  const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));

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

test('SPLIT CACHE / LocalStorage / killLocally', () => {
  const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));
  cache.addSplit('lol1', something);
  cache.addSplit('lol2', somethingElse);
  const initialChangeNumber = cache.getChangeNumber();

  // kill an non-existent split
  let updated = cache.killLocally('nonexistent_split', 'other_treatment', 101);
  const nonexistentSplit = cache.getSplit('nonexistent_split');

  expect(updated).toBe(false); // killLocally resolves without update if split doesn't exist
  expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

  // kill an existent split
  updated = cache.killLocally('lol1', 'some_treatment', 100);
  let lol1Split = cache.getSplit('lol1') as ISplit;

  expect(updated).toBe(true); // killLocally resolves with update if split is changed
  expect(lol1Split.killed).toBe(true); // existing split must be killed
  expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have new default treatment
  expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
  expect(cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

  // not update if changeNumber is old
  updated = cache.killLocally('lol1', 'some_treatment_2', 90);
  lol1Split = cache.getSplit('lol1') as ISplit;

  expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
  expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

});

test('SPLIT CACHE / LocalStorage / usesSegments', () => {
  const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));

  expect(cache.usesSegments()).toBe(true); // true initially, until data is synchronized
  cache.setChangeNumber(1); // to indicate that data has been synced.

  cache.addSplits([['split1', splitWithUserTT], ['split2', splitWithAccountTT],]);
  expect(cache.usesSegments()).toBe(false); // 0 splits using segments

  cache.addSplit('split3', splitWithAccountTTAndUsesSegments);
  expect(cache.usesSegments()).toBe(true); // 1 split using segments

  cache.addSplit('split4', splitWithAccountTTAndUsesSegments);
  expect(cache.usesSegments()).toBe(true); // 2 splits using segments

  cache.removeSplit('split3');
  expect(cache.usesSegments()).toBe(true); // 1 split using segments

  cache.removeSplit('split4');
  expect(cache.usesSegments()).toBe(false); // 0 splits using segments
});

test('SPLIT CACHE / LocalStorage / flag set cache tests', () => {
  // @ts-ignore
  const cache = new SplitsCacheInLocal({
    ...fullSettings,
    sync: { // @ts-expect-error
      __splitFiltersValidation: {
        groupedFilters: { bySet: ['o', 'n', 'e', 'x'], byName: [], byPrefix: [] },
        queryString: '&sets=e,n,o,x',
      }
    }
  }, new KeyBuilderCS('SPLITIO', 'user'));
  const emptySet = new Set([]);

  cache.addSplits([
    [featureFlagOne.name, featureFlagOne],
    [featureFlagTwo.name, featureFlagTwo],
    [featureFlagThree.name, featureFlagThree],
  ]);
  cache.addSplit(featureFlagWithEmptyFS.name, featureFlagWithEmptyFS);

  expect(cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
  expect(cache.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
  expect(cache.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
  expect(cache.getNamesByFlagSets(['t'])).toEqual([emptySet]); // 't' not in filter
  expect(cache.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);

  cache.addSplit(featureFlagOne.name, { ...featureFlagOne, sets: ['1'] });

  expect(cache.getNamesByFlagSets(['1'])).toEqual([emptySet]); // '1' not in filter
  expect(cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_two'])]);
  expect(cache.getNamesByFlagSets(['n'])).toEqual([emptySet]);

  cache.addSplit(featureFlagOne.name, { ...featureFlagOne, sets: ['x'] });
  expect(cache.getNamesByFlagSets(['x'])).toEqual([new Set(['ff_one'])]);
  expect(cache.getNamesByFlagSets(['o', 'e', 'x'])).toEqual([new Set(['ff_two']), new Set(['ff_three']), new Set(['ff_one'])]);


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
  const cacheWithoutFilters = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));
  const emptySet = new Set([]);

  cacheWithoutFilters.addSplits([
    [featureFlagOne.name, featureFlagOne],
    [featureFlagTwo.name, featureFlagTwo],
    [featureFlagThree.name, featureFlagThree],
  ]);
  cacheWithoutFilters.addSplit(featureFlagWithEmptyFS.name, featureFlagWithEmptyFS);

  expect(cacheWithoutFilters.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['t'])).toEqual([new Set(['ff_two', 'ff_three'])]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['y'])).toEqual([emptySet]);
  expect(cacheWithoutFilters.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);

  // Validate that the feature flag cache is cleared when calling `clear` method
  cacheWithoutFilters.clear();
  expect(localStorage.length).toBe(1); // only 'SPLITIO.hash' should remain in localStorage
  expect(localStorage.key(0)).toBe('SPLITIO.hash');
});
