import { SplitsCachePluggable } from '../SplitsCachePluggable';
import { KeyBuilder } from '../../KeyBuilder';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMockFactory } from './wrapper.mock';
import { splitWithUserTT, splitWithAccountTT, featureFlagOne, featureFlagThree, featureFlagTwo, featureFlagWithEmptyFS, featureFlagWithoutFS } from '../../__tests__/testUtils';
import { ISplit } from '../../../dtos/types';

const keysBuilder = new KeyBuilder();

describe('SPLITS CACHE PLUGGABLE', () => {

  test('add/remove/get splits', async () => {
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapperMockFactory());

    await cache.update([splitWithUserTT, splitWithAccountTT], [], -1);

    let values = await cache.getAll();

    expect(values).toEqual([splitWithUserTT, splitWithAccountTT]);

    // Assert getSplits
    let valuesObj = await cache.getSplits([splitWithUserTT.name, splitWithAccountTT.name]);
    expect(valuesObj).toEqual(values.reduce<Record<string, ISplit>>((acc, split) => {
      acc[split.name] = split;
      return acc;
    }, {}));

    // Assert getSplitNames
    let splitNames = await cache.getSplitNames();

    expect(splitNames.length).toBe(2);
    expect(splitNames.indexOf('user_ff') !== -1).toBe(true);
    expect(splitNames.indexOf('account_ff') !== -1).toBe(true);

    await cache.removeSplit('user_ff');

    values = await cache.getAll();

    expect(values).toEqual([splitWithAccountTT]);

    expect(await cache.getSplit('user_ff')).toEqual(null);
    expect(await cache.getSplit('account_ff')).toEqual(splitWithAccountTT);

    await cache.setChangeNumber(123);
    expect(await cache.getChangeNumber()).toBe(123);

    splitNames = await cache.getSplitNames();

    expect(splitNames.indexOf('user_ff') === -1).toBe(true);
    expect(splitNames.indexOf('account_ff') !== -1).toBe(true);

    const splits = await cache.getSplits(['user_ff', 'account_ff']);
    expect(splits['user_ff']).toEqual(null);
    expect(splits['account_ff']).toEqual(splitWithAccountTT);
  });

  test('trafficTypeExists', async () => {
    const wrapper = wrapperMockFactory();
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapper);

    await cache.update([
      { ...splitWithUserTT, name: 'split1' },
      { ...splitWithAccountTT, name: 'split2' },
      { ...splitWithUserTT, name: 'split3' },
    ], [], -1);
    await cache.addSplit({ ...splitWithUserTT, name: 'split4' });
    await cache.addSplit({ ...splitWithUserTT, name: 'split4' }); // trying to add the same definition for an already added split will not have effect

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);
    expect(await cache.trafficTypeExists('not_existent_tt')).toBe(false);

    await cache.removeSplit('split4');

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);

    expect(await wrapper.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe('1');

    await cache.removeSplit('split3');
    await cache.removeSplit('split2');

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    expect(await wrapper.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe(null); // TT entry should be removed in the wrapper

    await cache.removeSplit('split1');

    expect(await cache.trafficTypeExists('user_tt')).toBe(false);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    await cache.addSplit({ ...splitWithUserTT, name: 'split1' });
    expect(await cache.trafficTypeExists('user_tt')).toBe(true);

    await cache.addSplit({ ...splitWithAccountTT, name: 'split1' });
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);
    expect(await cache.trafficTypeExists('user_tt')).toBe(false);
  });

  test('killLocally', async () => {
    const wrapper = wrapperMockFactory();
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapper);

    await cache.update([splitWithUserTT, splitWithAccountTT], [], -1);
    const initialChangeNumber = await cache.getChangeNumber();

    // kill an non-existent split
    let updated = await cache.killLocally('nonexistent_split', 'other_treatment', 101);
    const nonexistentSplit = await cache.getSplit('nonexistent_split');

    expect(updated).toBe(false); // killLocally resolves without update if split doesn't exist
    expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

    // kill an existent split
    updated = await cache.killLocally('user_ff', 'some_treatment', 100);
    let lol1Split = await cache.getSplit('user_ff') as ISplit;

    expect(updated).toBe(true); // killLocally resolves with update if split is changed
    expect(lol1Split.killed).toBe(true); // existing split must be killed
    expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have new default treatment
    expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
    expect(await cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

    // not update if changeNumber is old
    updated = await cache.killLocally('user_ff', 'some_treatment_2', 90);
    lol1Split = await cache.getSplit('user_ff') as ISplit;

    expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
    expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

    // Delete splits and TT keys
    await cache.update([], [splitWithUserTT, splitWithAccountTT], -1);
    await wrapper.del(keysBuilder.buildSplitsTillKey());
    expect(await wrapper.getKeysByPrefix('SPLITIO')).toHaveLength(0);
  });

  test('flag set cache tests', async () => {
    const wrapper = wrapperMockFactory(); // @ts-ignore
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapper, { groupedFilters: { bySet: ['o', 'n', 'e', 'x'] } });
    const emptySet = new Set([]);

    await cache.update([
      featureFlagOne,
      featureFlagTwo,
      featureFlagThree,
    ], [], -1);
    await cache.addSplit(featureFlagWithEmptyFS);

    expect(await cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
    expect(await cache.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
    expect(await cache.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
    expect(await cache.getNamesByFlagSets(['t'])).toEqual([emptySet]); // 't' not in filter
    expect(await cache.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);

    await cache.addSplit({ ...featureFlagOne, sets: ['1'] });

    expect(await cache.getNamesByFlagSets(['1'])).toEqual([emptySet]); // '1' not in filter
    expect(await cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_two'])]);
    expect(await cache.getNamesByFlagSets(['n'])).toEqual([emptySet]);

    await cache.addSplit({ ...featureFlagOne, sets: ['x'] });
    expect(await cache.getNamesByFlagSets(['x'])).toEqual([new Set(['ff_one'])]);
    expect(await cache.getNamesByFlagSets(['o', 'e', 'x'])).toEqual([new Set(['ff_two']), new Set(['ff_three']), new Set(['ff_one'])]);

    // Simulate one error in getItems
    wrapper.getItems.mockImplementationOnce(() => Promise.reject('error'));
    expect(await cache.getNamesByFlagSets(['o', 'e', 'x'])).toEqual([emptySet, new Set(['ff_three']), new Set(['ff_one'])]);

    await cache.removeSplit(featureFlagOne.name);
    expect(await cache.getNamesByFlagSets(['x'])).toEqual([emptySet]);

    await cache.removeSplit(featureFlagOne.name);
    expect(await cache.getNamesByFlagSets(['y'])).toEqual([emptySet]); // 'y' not in filter
    expect(await cache.getNamesByFlagSets([])).toEqual([]);

    await cache.addSplit({ ...featureFlagWithoutFS, name: featureFlagWithEmptyFS.name });
    expect(await cache.getNamesByFlagSets([])).toEqual([]);
  });

  // if FlagSets filter is not defined, it should store all FlagSets in memory.
  test('flag set cache tests without filters', async () => {
    const cacheWithoutFilters = new SplitsCachePluggable(loggerMock, keysBuilder, wrapperMockFactory());
    const emptySet = new Set([]);

    await cacheWithoutFilters.update([
      featureFlagOne,
      featureFlagTwo,
      featureFlagThree
    ], [], -1);
    await cacheWithoutFilters.addSplit(featureFlagWithEmptyFS);

    expect(await cacheWithoutFilters.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['t'])).toEqual([new Set(['ff_two', 'ff_three'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['y'])).toEqual([emptySet]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);
  });

});
