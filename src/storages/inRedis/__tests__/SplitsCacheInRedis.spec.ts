import Redis from 'ioredis';
import SplitsCacheInRedis from '../SplitsCacheInRedis';
import KeyBuilderSS from '../../KeyBuilderSS';

test('SPLITS CACHE / Redis', async () => {
  const connection = new Redis();
  // @ts-expect-error
  const keys = new KeyBuilderSS();
  const cache = new SplitsCacheInRedis(keys, connection);

  await cache.clear();

  await cache.addSplits([
    ['lol1', 'something'],
    ['lol2', 'something else']
  ]);

  let values = await cache.getAll();

  expect(values.indexOf('something') !== -1).toBe(true);
  expect(values.indexOf('something else') !== -1).toBe(true);

  let splitNames = await cache.getSplitNames();

  expect(splitNames.indexOf('lol1') !== -1).toBe(true);
  expect(splitNames.indexOf('lol2') !== -1).toBe(true);

  await cache.removeSplit('lol1');

  values = await cache.getAll();

  expect(values.indexOf('something') === -1).toBe(true);
  expect(values.indexOf('something else') !== -1).toBe(true);

  expect(await cache.getSplit('lol1') == null).toBe(true);
  expect(await cache.getSplit('lol2') === 'something else').toBe(true);

  await cache.setChangeNumber(123);
  expect(await cache.getChangeNumber() === 123).toBe(true);

  splitNames = await cache.getSplitNames();

  expect(splitNames.indexOf('lol1') === -1).toBe(true);
  expect(splitNames.indexOf('lol2') !== -1).toBe(true);

  const splits = await cache.getSplits(['lol1', 'lol2']);
  expect(splits['lol1'] === null).toBe(true);
  expect(splits['lol2'] === 'something else').toBe(true);

  await connection.quit();
});

test('SPLITS CACHE / Redis / trafficTypeExists tests', async () => {
  const prefix = 'splits_cache_ut';
  const connection = new Redis();
  // @ts-expect-error
  const keys = new KeyBuilderSS(prefix);
  const cache = new SplitsCacheInRedis(keys, connection);

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
