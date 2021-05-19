import Redis from 'ioredis';
import SplitsCacheInRedis from '../SplitsCacheInRedis';
import KeyBuilderSS from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { splitWithUserTT, splitWithAccountTT } from '../../__tests__/testUtils';

describe('SPLITS CACHE REDIS', () => {

  test('add/remove/get splits & set/get change number', async () => {
    const connection = new Redis();
    // @ts-expect-error
    const keys = new KeyBuilderSS();
    const cache = new SplitsCacheInRedis(loggerMock, keys, connection);

    await cache.clear();

    await cache.addSplits([
      ['lol1', splitWithUserTT],
      ['lol2', splitWithAccountTT]
    ]);

    let values = await cache.getAll();

    expect(values.indexOf(splitWithUserTT) !== -1).toBe(true);
    expect(values.indexOf(splitWithAccountTT) !== -1).toBe(true);

    let splitNames = await cache.getSplitNames();

    expect(splitNames.indexOf('lol1') !== -1).toBe(true);
    expect(splitNames.indexOf('lol2') !== -1).toBe(true);

    await cache.removeSplit('lol1');

    values = await cache.getAll();

    expect(values.indexOf(splitWithUserTT) === -1).toBe(true);
    expect(values.indexOf(splitWithAccountTT) !== -1).toBe(true);

    expect(await cache.getSplit('lol1') == null).toBe(true);
    expect(await cache.getSplit('lol2') === splitWithAccountTT).toBe(true);

    await cache.setChangeNumber(123);
    expect(await cache.getChangeNumber() === 123).toBe(true);

    splitNames = await cache.getSplitNames();

    expect(splitNames.indexOf('lol1') === -1).toBe(true);
    expect(splitNames.indexOf('lol2') !== -1).toBe(true);

    const splits = await cache.getSplits(['lol1', 'lol2']);
    expect(splits['lol1'] === null).toBe(true);
    expect(splits['lol2'] === splitWithAccountTT).toBe(true);

    await connection.quit();
  });

  test('trafficTypeExists', async () => {
    const prefix = 'splits_cache_ut';
    const connection = new Redis();
    // @ts-expect-error
    const keys = new KeyBuilderSS(prefix);
    const cache = new SplitsCacheInRedis(loggerMock, keys, connection);

    const testTTName = 'tt_test_name';
    const testTTNameNoCount = 'tt_test_name_2';
    const testTTNameInvalid = 'tt_test_name_3';
    const ttKey = keys.buildTrafficTypeKey(testTTName);
    const ttKeyNoCount = keys.buildTrafficTypeKey(testTTNameNoCount);
    const ttKeyInvalid = keys.buildTrafficTypeKey(testTTNameInvalid);

    await cache.clear();

    await connection.set(ttKey, 3);
    await connection.set(ttKeyNoCount, 0);
    await connection.set(ttKeyInvalid, 'NaN');

    expect(await cache.trafficTypeExists(testTTName)).toBe(true);
    expect(await cache.trafficTypeExists(testTTNameNoCount)).toBe(false);
    expect(await cache.trafficTypeExists(ttKeyInvalid)).toBe(false);
    expect(await cache.trafficTypeExists('not_existent_tt')).toBe(false);

    await connection.del(ttKey);
    await connection.del(ttKeyNoCount);
    await connection.del(ttKeyInvalid);

    await connection.quit();
  });

  test('killLocally', async () => {
    const connection = new Redis();
    // @ts-expect-error
    const keys = new KeyBuilderSS();
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
    let lol1Split = JSON.parse(await cache.getSplit('lol1') as string);

    expect(updated).toBe(true); // killLocally resolves with update if split is changed
    expect(lol1Split.killed).toBe(true); // existing split must be killed
    expect(lol1Split.defaultTreatment).toBe('some_treatment'); // existing split must have new default treatment
    expect(lol1Split.changeNumber).toBe(100); // existing split must have the given change number
    expect(await cache.getChangeNumber()).toBe(initialChangeNumber); // cache changeNumber is not changed

    // not update if changeNumber is old
    updated = await cache.killLocally('lol1', 'some_treatment_2', 90);
    lol1Split = JSON.parse(await cache.getSplit('lol1') as string);

    expect(updated).toBe(false); // killLocally resolves without update if changeNumber is old
    expect(lol1Split.defaultTreatment).not.toBe('some_treatment_2'); // existing split is not updated if given changeNumber is older

    // Delete splits and TT keys
    await cache.removeSplits(['lol1', 'lol2']);
    await connection.del(keys.buildTrafficTypeKey('account_tt'));
    await connection.del(keys.buildTrafficTypeKey('user_tt'));
    expect(await connection.keys('*')).toHaveLength(0);

    await connection.quit();
  });

});
