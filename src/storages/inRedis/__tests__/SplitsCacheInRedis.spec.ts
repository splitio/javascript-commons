import Redis from 'ioredis';
import { SplitsCacheInRedis } from '../SplitsCacheInRedis';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { splitWithUserTT, splitWithAccountTT } from '../../__tests__/testUtils';
import { ISplit } from '../../../dtos/types';
import { metadata } from '../../__tests__/KeyBuilder.spec';

const prefix = 'splits_cache_ut';

describe('SPLITS CACHE REDIS', () => {

  test('add/remove/get splits & set/get change number', async () => {
    const connection = new Redis();
    const keysBuilder = new KeyBuilderSS(prefix, metadata);
    const cache = new SplitsCacheInRedis(loggerMock, keysBuilder, connection);

    await cache.clear();

    await cache.addSplits([
      ['lol1', splitWithUserTT],
      ['lol2', splitWithAccountTT]
    ]);

    let values = await cache.getAll();

    expect(values).toEqual([splitWithUserTT, splitWithAccountTT]);

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

    await connection.del(keysBuilder.buildTrafficTypeKey('account_tt'));
    await connection.del(keysBuilder.buildSplitKey('lol2'));
    await connection.del(keysBuilder.buildSplitsTillKey());
    await connection.quit();
  });

  test('trafficTypeExists', async () => {
    const prefix = 'splits_cache_ut';
    const connection = new Redis();
    const keysBuilder = new KeyBuilderSS(prefix, metadata);
    const cache = new SplitsCacheInRedis(loggerMock, keysBuilder, connection);

    await cache.addSplits([
      ['split1', splitWithUserTT],
      ['split2', splitWithAccountTT],
      ['split3', splitWithUserTT], // @ts-ignore
      ['malformed', {}]
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

    await connection.del(keysBuilder.buildTrafficTypeKey('account_tt'));
    await connection.del(keysBuilder.buildSplitKey('malformed'));
    await connection.del(keysBuilder.buildSplitKey('split1'));
    await connection.quit();

  });

  test('killLocally', async () => {
    const connection = new Redis();
    const keys = new KeyBuilderSS(prefix, metadata);
    const cache = new SplitsCacheInRedis(loggerMock, keys, connection);

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
    await connection.del(keys.buildTrafficTypeKey('account_tt'));
    await connection.del(keys.buildTrafficTypeKey('user_tt'));
    expect(await connection.keys(`${prefix}*`)).toHaveLength(0);

    await connection.quit();
  });

});
