import { SplitsCacheInRedis } from '../SplitsCacheInRedis';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { splitWithUserTT, splitWithAccountTT, featureFlagOne, featureFlagThree, featureFlagTwo, featureFlagWithEmptyFS, featureFlagWithoutFS } from '../../__tests__/testUtils';
import { ISplit } from '../../../dtos/types';
import { metadata } from '../../__tests__/KeyBuilder.spec';
import { RedisAdapter } from '../RedisAdapter';

const prefix = 'splits_cache_ut';
const keysBuilder = new KeyBuilderSS(prefix, metadata);

describe('SPLITS CACHE REDIS', () => {

  test('add/remove/get splits & set/get change number', async () => {
    const connection = new RedisAdapter(loggerMock);
    const cache = new SplitsCacheInRedis(loggerMock, keysBuilder, connection);

    await cache.addSplits([
      ['lol1', splitWithUserTT],
      ['lol2', splitWithAccountTT]
    ]);

    let values = await cache.getAll();

    expect(values).toHaveLength(2);
    expect(values).toEqual(values[0].trafficTypeName === splitWithUserTT.trafficTypeName ? [splitWithUserTT, splitWithAccountTT] : [splitWithAccountTT, splitWithUserTT]);

    let splitNames = await cache.getSplitNames();

    expect(splitNames.indexOf('lol1') !== -1).toBe(true);
    expect(splitNames.indexOf('lol2') !== -1).toBe(true);

    await cache.removeSplit('lol1');

    values = await cache.getAll();

    expect(values).toEqual([splitWithAccountTT]);

    expect(await cache.getSplit('lol1')).toEqual(null);
    expect(await cache.getSplit('lol2')).toEqual(splitWithAccountTT);

    await cache.setChangeNumber(123);
    expect(await cache.getChangeNumber() === 123).toBe(true);

    splitNames = await cache.getSplitNames();

    expect(splitNames.indexOf('lol1') === -1).toBe(true);
    expect(splitNames.indexOf('lol2') !== -1).toBe(true);

    const splits = await cache.getSplits(['lol1', 'lol2']);
    expect(splits['lol1']).toEqual(null);
    expect(splits['lol2']).toEqual(splitWithAccountTT);

    // Teardown. @TODO use cache clear method when implemented
    await connection.del(keysBuilder.buildTrafficTypeKey('account_tt'));
    await connection.del(keysBuilder.buildSplitKey('lol2'));
    await connection.del(keysBuilder.buildSplitsTillKey());
    await connection.disconnect();
  });

  test('trafficTypeExists', async () => {
    const connection = new RedisAdapter(loggerMock);
    const cache = new SplitsCacheInRedis(loggerMock, keysBuilder, connection);

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

    expect(await connection.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe('1');

    await cache.removeSplits(['split3', 'split2']); // it'll invoke a loop of removeSplit

    expect(await cache.trafficTypeExists('user_tt')).toBe(true);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    expect(await connection.get(keysBuilder.buildTrafficTypeKey('account_tt'))).toBe(null); // TT entry should be removed in the wrapper

    await cache.removeSplit('split1');

    expect(await cache.trafficTypeExists('user_tt')).toBe(false);
    expect(await cache.trafficTypeExists('account_tt')).toBe(false);

    await cache.addSplit('split1', splitWithUserTT);
    expect(await cache.trafficTypeExists('user_tt')).toBe(true);

    await cache.addSplit('split1', splitWithAccountTT);
    expect(await cache.trafficTypeExists('account_tt')).toBe(true);
    expect(await cache.trafficTypeExists('user_tt')).toBe(false);

    // Teardown. @TODO use cache clear method when implemented
    await connection.del(keysBuilder.buildTrafficTypeKey('account_tt'));
    await connection.del(keysBuilder.buildSplitKey('malformed'));
    await connection.del(keysBuilder.buildSplitKey('split1'));
    await connection.disconnect();
  });

  test('killLocally', async () => {
    const connection = new RedisAdapter(loggerMock);
    const cache = new SplitsCacheInRedis(loggerMock, keysBuilder, connection);

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
    expect(await connection.keys(`${prefix}*`)).toHaveLength(0);
    await connection.disconnect();
  });

  test('flag set cache tests', async () => {
    const connection = new RedisAdapter(loggerMock); // @ts-ignore
    const cache = new SplitsCacheInRedis(loggerMock, keysBuilder, connection, { groupedFilters: { bySet: ['o', 'n', 'e', 'x'] } });

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

    // @ts-ignore Simulate an error in connection.pipeline().exec()
    jest.spyOn(connection, 'pipeline').mockImplementationOnce(() => {
      return { exec: () => Promise.resolve([['error', null], [null, ['ff_three']], [null, ['ff_one']]]) };
    });
    expect(await cache.getNamesByFlagSets(['o', 'e', 'x'])).toEqual([emptySet, new Set(['ff_three']), new Set(['ff_one'])]);
    (connection.pipeline as jest.Mock).mockRestore();

    await cache.removeSplit(featureFlagOne.name);
    expect(await cache.getNamesByFlagSets(['x'])).toEqual([emptySet]);

    await cache.removeSplit(featureFlagOne.name);
    expect(await cache.getNamesByFlagSets(['y'])).toEqual([emptySet]); // 'y' not in filter
    expect(await cache.getNamesByFlagSets([])).toEqual([]);

    await cache.addSplit(featureFlagWithEmptyFS.name, featureFlagWithoutFS);
    expect(await cache.getNamesByFlagSets([])).toEqual([]);

    // Delete splits, TT and flag set keys
    await cache.removeSplits([featureFlagThree.name, featureFlagTwo.name, featureFlagWithEmptyFS.name]);
    expect(await connection.keys(`${prefix}*`)).toHaveLength(0);
    await connection.disconnect();
  });

  // if FlagSets filter is not defined, it should store all FlagSets in memory.
  test('flag set cache tests without filters', async () => {
    const connection = new RedisAdapter(loggerMock);
    const cacheWithoutFilters = new SplitsCacheInRedis(loggerMock, keysBuilder, connection);

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

    // Delete splits, TT and flag set keys
    await cacheWithoutFilters.removeSplits([featureFlagThree.name, featureFlagTwo.name, featureFlagOne.name, featureFlagWithEmptyFS.name]);
    expect(await connection.keys(`${prefix}*`)).toHaveLength(0);
    await connection.disconnect();
  });

});
