import { SplitsCacheInLocal } from '../SplitsCacheInLocal';
import { KeyBuilderCS } from '../../KeyBuilderCS';
import { splitWithUserTT, splitWithAccountTT, splitWithAccountTTAndUsesSegments, something, somethingElse, featureFlagOne, featureFlagTwo, featureFlagThree, featureFlagWithEmptyFS, featureFlagWithoutFS } from '../../__tests__/testUtils';
import { ISplit } from '../../../dtos/types';
import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { StorageAdapter } from '../../types';
import { storages, PREFIX } from './wrapper.mock';

function storageMethods(storage: StorageAdapter) {
  return {
    get length() { return storage.length; },
    key: (index: number) => storage.key(index),
    getItem: (key: string) => storage.getItem(key),
    removeItem: (key: string) => storage.removeItem(key),
  };
}

describe.each(storages)('SPLITS CACHE', (storage) => {
  test('LocalStorage', () => {
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), storage);

    cache.clear();

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

  test('LocalStorage / Get Keys', () => {
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), storage);

    cache.update([something, somethingElse], [], 1);

    const keys = cache.getSplitNames();

    expect(keys.indexOf(something.name) !== -1).toBe(true);
    expect(keys.indexOf(somethingElse.name) !== -1).toBe(true);
  });

  test('LocalStorage / Update Splits', () => {
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), storage);

    cache.update([something, somethingElse], [], 1);

    cache.update([], [something, somethingElse], 1);

    expect(cache.getSplit(something.name)).toBe(null);
    expect(cache.getSplit(somethingElse.name)).toBe(null);
  });

  test('LocalStorage / trafficTypeExists and ttcache tests', () => {
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), storage);

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

  test('LocalStorage / killLocally', () => {
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), storage);

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

  test('LocalStorage / usesSegments', () => {
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), storage);

    expect(cache.usesSegments()).toBe(true); // true initially, until data is synchronized
    cache.setChangeNumber(1); // to indicate that data has been synced.

    cache.update([splitWithUserTT, splitWithAccountTT], [], 1);
    expect(cache.usesSegments()).toBe(false); // 0 splits using segments

    cache.addSplit({ ...splitWithAccountTTAndUsesSegments, name: 'split3' });
    expect(cache.usesSegments()).toBe(true); // 1 split using segments

    cache.addSplit({ ...splitWithAccountTTAndUsesSegments, name: 'split4' });
    expect(cache.usesSegments()).toBe(true); // 2 splits using segments

    cache.removeSplit('split3');
    expect(cache.usesSegments()).toBe(true); // 1 split using segments

    cache.removeSplit('split4');
    expect(cache.usesSegments()).toBe(false); // 0 splits using segments
  });

  test('LocalStorage / flag set cache tests', () => {
    // @ts-ignore
    const cache = new SplitsCacheInLocal({
      ...fullSettings,
      sync: { // @ts-expect-error
        __splitFiltersValidation: {
          groupedFilters: { bySet: ['o', 'n', 'e', 'x'], byName: [], byPrefix: [] },
          queryString: '&sets=e,n,o,x',
        }
      }
    }, new KeyBuilderCS(PREFIX, 'user'), storage);

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
  });

  // if FlagSets are not defined, it should store all FlagSets in memory.
  test('LocalStorage / flag set cache tests without filters', () => {
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), storage);

    const emptySet = new Set([]);

    cache.update([
      featureFlagOne,
      featureFlagTwo,
      featureFlagThree,
    ], [], -1);
    cache.addSplit(featureFlagWithEmptyFS);

    expect(cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
    expect(cache.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
    expect(cache.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
    expect(cache.getNamesByFlagSets(['t'])).toEqual([new Set(['ff_two', 'ff_three'])]);
    expect(cache.getNamesByFlagSets(['y'])).toEqual([emptySet]);
    expect(cache.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);

    // Validate that the feature flag cache is cleared when calling `clear` method
    cache.clear();
    expect(storage.length).toBe(0);
  });

  test('LocalStorage / flag sets are batched in update', () => {
    const keys = new KeyBuilderCS(PREFIX, 'user');
    const writes: string[] = [];
    const spiedStorage = { ...storageMethods(storage), setItem: (key: string, value: string) => { writes.push(key); storage.setItem(key, value); } };
    const cache = new SplitsCacheInLocal(fullSettings, keys, spiedStorage);
    cache.clear();
    const ff = (name: string, sets: string[]) => ({ ...featureFlagOne, name, sets } as ISplit);

    // several flags across overlapping sets
    cache.update([ff('a', ['x', 'y']), ff('b', ['y', 'z']), ff('c', ['x', 'y', 'z'])], [], 1);
    expect(cache.getNamesByFlagSets(['x', 'y', 'z'])).toEqual([new Set(['a', 'c']), new Set(['a', 'b', 'c']), new Set(['b', 'c'])]);

    // each flag set is serialized once per update
    writes.length = 0;
    cache.update([ff('d', ['x', 'y']), ff('e', ['x', 'y'])], [], 2);
    const writesPerSet = (set: string) => writes.filter(key => key === keys.buildFlagSetKey(set)).length;
    expect(writesPerSet('x')).toBe(1);
    expect(writesPerSet('y')).toBe(1);

    // a flag changing sets, a flag removed, and an empty set being removed
    cache.update([ff('a', ['z'])], [ff('b', [])], 3);
    expect(cache.getNamesByFlagSets(['x', 'y', 'z'])).toEqual([new Set(['c', 'd', 'e']), new Set(['c', 'd', 'e']), new Set(['a', 'c'])]);

    cache.update([ff('a', ['w'])], [], 4);
    expect(cache.getNamesByFlagSets(['w', 'z'])).toEqual([new Set(['a']), new Set(['c'])]);

    cache.update([], [ff('a', [])], 5);
    expect(cache.getNamesByFlagSets(['w'])).toEqual([new Set()]);
    expect(storage.getItem(keys.buildFlagSetKey('w'))).toBeNull();

    // flag added and then moved within the same update
    cache.update([ff('f', ['p']), ff('f', ['q'])], [], 6);
    expect(cache.getNamesByFlagSets(['p', 'q'])).toEqual([new Set(), new Set(['f'])]);
    expect(storage.getItem(keys.buildFlagSetKey('p'))).toBeNull();

    cache.clear();
  });

  test('LocalStorage / traffic type and segments counts are batched in update', () => {
    const keys = new KeyBuilderCS(PREFIX, 'user');
    const writes: string[] = [];
    const spiedStorage = { ...storageMethods(storage), setItem: (key: string, value: string) => { writes.push(key); storage.setItem(key, value); } };
    const cache = new SplitsCacheInLocal(fullSettings, keys, spiedStorage);
    cache.clear();

    const ttKey = (tt: string) => keys.buildTrafficTypeKey(tt);
    const segmentsKey = keys.buildSplitsWithSegmentCountKey();
    const writesOf = (key: string) => writes.filter(k => k === key).length;

    cache.update([splitWithUserTT, splitWithAccountTT, splitWithAccountTTAndUsesSegments], [], 1);
    expect(storage.getItem(ttKey('user_tt'))).toBe('1');
    expect(storage.getItem(ttKey('account_tt'))).toBe('2');
    expect(storage.getItem(segmentsKey)).toBe('1');

    const many = (n: number, tt: string, withSegments: boolean) => Array.from({ length: n }, (_, i) => ({
      ...(withSegments ? splitWithAccountTTAndUsesSegments : splitWithUserTT), name: `${tt}_${withSegments}_${i}`, trafficTypeName: tt
    } as ISplit));

    writes.length = 0;
    cache.update([...many(5, 'user_tt', false), ...many(3, 'account_tt', true)], [], 2);
    expect(writesOf(ttKey('user_tt'))).toBe(1);
    expect(writesOf(ttKey('account_tt'))).toBe(1);
    expect(writesOf(segmentsKey)).toBe(1);
    expect(storage.getItem(ttKey('user_tt'))).toBe('6');
    expect(storage.getItem(ttKey('account_tt'))).toBe('5');
    expect(storage.getItem(segmentsKey)).toBe('4');

    // a flag changing traffic type and no longer using segments, and removing flags down to zero
    cache.update([{ ...splitWithAccountTTAndUsesSegments, trafficTypeName: 'user_tt', conditions: [] } as ISplit], many(5, 'user_tt', false), 3);
    expect(storage.getItem(ttKey('user_tt'))).toBe('2');
    expect(storage.getItem(ttKey('account_tt'))).toBe('4');
    expect(storage.getItem(segmentsKey)).toBe('3');
    expect(cache.trafficTypeExists('user_tt')).toBe(true);

    cache.update([], [...many(3, 'account_tt', true), splitWithAccountTT, splitWithAccountTTAndUsesSegments], 4);
    expect(storage.getItem(ttKey('account_tt'))).toBeNull();
    expect(storage.getItem(segmentsKey)).toBeNull();

    cache.clear();
  });

  test('LocalStorage / disableFlagSetCache', () => {
    const settings = { ...fullSettings, log: loggerMock };
    const keys = new KeyBuilderCS(PREFIX, 'user');
    const cache = new SplitsCacheInLocal(settings, keys, storage, true);
    cache.clear();
    loggerMock.mockClear();

    cache.update([featureFlagOne, featureFlagTwo, featureFlagThree], [], 1);

    // flags and counts are stored, but flag sets are not
    expect(cache.getSplit('ff_one')).toEqual(featureFlagOne);
    expect(storage.getItem(keys.buildTrafficTypeKey(featureFlagOne.trafficTypeName))).toBe('3');
    ['o', 'n', 'e', 't'].forEach(set => expect(storage.getItem(keys.buildFlagSetKey(set))).toBeNull());
    expect(loggerMock.error).not.toBeCalled();

    // flag sets lookups return empty sets and log an error
    expect(cache.getNamesByFlagSets(['o', 'n'])).toEqual([new Set(), new Set()]);
    expect(loggerMock.error).toBeCalledTimes(1);

    // updating and removing flags still work
    cache.update([{ ...featureFlagOne, sets: ['x'] }], [featureFlagTwo], 2);
    expect(cache.getSplit('ff_two')).toBeNull();
    expect(storage.getItem(keys.buildFlagSetKey('x'))).toBeNull();

    cache.clear();
  });

  test('LocalStorage / flag sets flush errors are logged and do not throw', () => {
    const failingStorage = { ...storageMethods(storage), setItem: (key: string, value: string) => { if (key.indexOf('.flagSet.') > -1) throw new Error('quota'); storage.setItem(key, value); } };
    const cache = new SplitsCacheInLocal(fullSettings, new KeyBuilderCS(PREFIX, 'user'), failingStorage);
    cache.clear();
    const errorSpy = jest.spyOn(fullSettings.log, 'error');

    expect(() => cache.update([featureFlagOne], [], 1)).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    cache.clear();
  });
});
