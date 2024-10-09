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

    // Assert addSplit and addSplits
    await cache.addSplits([
      ['lol1', splitWithUserTT],
      ['lol2', splitWithAccountTT]
    ]);
    await cache.addSplit('lol3', splitWithAccountTT);

    // Assert getAll
    let values = await cache.getAll();

    expect(values).toEqual([splitWithUserTT, splitWithAccountTT, splitWithAccountTT]);

    // Assert getSplits
    let valuesObj = await cache.getSplits(['lol2', 'lol3']);

    expect(Object.keys(valuesObj).length).toBe(2);
    expect(valuesObj.lol2).toEqual(splitWithAccountTT);
    expect(valuesObj.lol3).toEqual(splitWithAccountTT);

    // Assert getSplitNames
    let splitNames = await cache.getSplitNames();

    expect(splitNames.length).toBe(3);
    expect(splitNames.indexOf('lol1') !== -1).toBe(true);
    expect(splitNames.indexOf('lol2') !== -1).toBe(true);
    expect(splitNames.indexOf('lol3') !== -1).toBe(true);

    // Assert removeSplit
    await cache.removeSplit('lol1');

    values = await cache.getAll();
    expect(values.length).toBe(2);
    expect(await cache.getSplit('lol1')).toEqual(null);
    expect(await cache.getSplit('lol2')).toEqual(splitWithAccountTT);

    // Assert removeSplits
    await cache.addSplit('lol1', splitWithUserTT);
    await cache.removeSplits(['lol1', 'lol3']);

    values = await cache.getAll();
    expect(values.length).toBe(1);
    splitNames = await cache.getSplitNames();
    expect(splitNames.length).toBe(1);
    expect(await cache.getSplit('lol1')).toEqual(null);
    expect(await cache.getSplit('lol2')).toEqual(splitWithAccountTT);

  });

  test('set/get change number', async () => {
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapperMockFactory());

    expect(await cache.getChangeNumber()).toBe(-1); // if not set yet, changeNumber is -1
    await cache.setChangeNumber(123);
    expect(await cache.getChangeNumber()).toBe(123);

  });

  test('trafficTypeExists', async () => {
    const wrapper = wrapperMockFactory();
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapper);

    await cache.addSplits([
      ['split1', splitWithUserTT],
      ['split2', splitWithAccountTT],
      ['split3', splitWithUserTT],
    ]);
    await cache.addSplit('split4', splitWithUserTT);
    await cache.addSplit('split4', splitWithUserTT); // trying to add the same definition for an already added split will not have effect

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);
    expect(await cache.trafficTypeExists('not_existent_tt')).toBe(false);

    await cache.removeSplit('split4');

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);

    expect(await wrapper.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe('1');

    await cache.removeSplits(['split3', 'split2']); // it'll invoke a loop of removeSplit

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    expect(await wrapper.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe(null); // TT entry should be removed in the wrapper

    await cache.removeSplit('split1');

    expect(await cache.trafficTypeExists('user_tt')).toBe(false);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    await cache.addSplit('split1', splitWithUserTT);
    expect(await cache.trafficTypeExists('user_tt')).toBe(true);

    await cache.addSplit('split1', splitWithAccountTT);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);
    expect(await cache.trafficTypeExists('user_tt')).toBe(false);

  });

  test('killLocally', async () => {
    const wrapper = wrapperMockFactory();
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapper);

    await cache.addSplit('lol1', splitWithUserTT);
    await cache.addSplit('lol2', splitWithAccountTT);
    const initialChangeNumber = await cache.getChangeNumber();

    // kill an non-existent split
    let updated = await cache.killLocally('nonexistent_split', 'other_treatment', 101);
    const nonexistentSplit = await cache.getSplit('nonexistent_split');

    expect(updated).toBe(false); // killLocally resolves without update if split doesn't exist
    expect(nonexistentSplit).toBe(null); // non-existent split keeps being non-existent

    // kill an existent split
    updated = await cache.killLocally('lol1', 'some_treatment', 100);
    let lol1Split = await cache.getSplit('lol1') as ISplit;

    expect(updated).toBe(true); // killLocally resolves with update if split is changed
    expect(lol1Split.killed).toBe(true); // existing split must be killed
    expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have new default treatment
    expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
    expect(await cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

    // not update if changeNumber is old
    updated = await cache.killLocally('lol1', 'some_treatment_2', 90);
    lol1Split = await cache.getSplit('lol1') as ISplit;

    expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
    expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

    // Delete splits and TT keys
    await cache.removeSplits(['lol1', 'lol2']);
    expect(await wrapper.getKeysByPrefix('SPLITIO')).toHaveLength(0);
  });

  test('flag set cache tests', async () => {
    const wrapper = wrapperMockFactory(); // @ts-ignore
    const cache = new SplitsCachePluggable(loggerMock, keysBuilder, wrapper, { groupedFilters: { bySet: ['o', 'n', 'e', 'x'] } });
    const emptySet = new Set([]);

    await cache.addSplits([
      [featureFlagOne.name, featureFlagOne],
      [featureFlagTwo.name, featureFlagTwo],
      [featureFlagThree.name, featureFlagThree],
    ]);
    await cache.addSplit(featureFlagWithEmptyFS.name, featureFlagWithEmptyFS);

    expect(await cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
    expect(await cache.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
    expect(await cache.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
    expect(await cache.getNamesByFlagSets(['t'])).toEqual([emptySet]); // 't' not in filter
    expect(await cache.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);

    await cache.addSplit(featureFlagOne.name, { ...featureFlagOne, sets: ['1'] });

    expect(await cache.getNamesByFlagSets(['1'])).toEqual([emptySet]); // '1' not in filter
    expect(await cache.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_two'])]);
    expect(await cache.getNamesByFlagSets(['n'])).toEqual([emptySet]);

    await cache.addSplit(featureFlagOne.name, { ...featureFlagOne, sets: ['x'] });
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

    await cache.addSplit(featureFlagWithEmptyFS.name, featureFlagWithoutFS);
    expect(await cache.getNamesByFlagSets([])).toEqual([]);
  });

  // if FlagSets filter is not defined, it should store all FlagSets in memory.
  test('flag set cache tests without filters', async () => {
    const cacheWithoutFilters = new SplitsCachePluggable(loggerMock, keysBuilder, wrapperMockFactory());
    const emptySet = new Set([]);

    await cacheWithoutFilters.addSplits([
      [featureFlagOne.name, featureFlagOne],
      [featureFlagTwo.name, featureFlagTwo],
      [featureFlagThree.name, featureFlagThree],
    ]);
    await cacheWithoutFilters.addSplit(featureFlagWithEmptyFS.name, featureFlagWithEmptyFS);

    expect(await cacheWithoutFilters.getNamesByFlagSets(['o'])).toEqual([new Set(['ff_one', 'ff_two'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['n'])).toEqual([new Set(['ff_one'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['e'])).toEqual([new Set(['ff_one', 'ff_three'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['t'])).toEqual([new Set(['ff_two', 'ff_three'])]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['y'])).toEqual([emptySet]);
    expect(await cacheWithoutFilters.getNamesByFlagSets(['o', 'n', 'e'])).toEqual([new Set(['ff_one', 'ff_two']), new Set(['ff_one']), new Set(['ff_one', 'ff_three'])]);
  });

});
