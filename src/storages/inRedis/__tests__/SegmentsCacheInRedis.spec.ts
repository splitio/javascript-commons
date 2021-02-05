import Redis from 'ioredis';
import SegmentsCacheInRedis from '../SegmentsCacheInRedis';
import KeyBuilderSS from '../../KeyBuilderSS';

test('SEGMENTS CACHE IN Redis / suite', async () => {
  const connection = new Redis();
  // @ts-expect-error
  const keys = new KeyBuilderSS();
  const cache = new SegmentsCacheInRedis(keys, connection);

  await cache.clear();

  await cache.addToSegment('mocked-segment', ['a', 'b', 'c']);

  await cache.setChangeNumber('mocked-segment', 1);

  await cache.removeFromSegment('mocked-segment', ['d']);

  expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

  await cache.addToSegment('mocked-segment', ['d', 'e']);

  await cache.removeFromSegment('mocked-segment', ['a', 'c']);

  expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

  expect(await cache.isInSegment('mocked-segment', 'a')).toBe(false);
  expect(await cache.isInSegment('mocked-segment', 'b')).toBe(true);
  expect(await cache.isInSegment('mocked-segment', 'c')).toBe(false);
  expect(await cache.isInSegment('mocked-segment', 'd')).toBe(true);
  expect(await cache.isInSegment('mocked-segment', 'e')).toBe(true);

  await connection.quit();
});

test('SEGMENTS CACHE IN Redis / register segments', async () => {
  const connection = new Redis();
  // @ts-expect-error
  const keys = new KeyBuilderSS();

  const cache = new SegmentsCacheInRedis(keys, connection);

  await cache.clear();

  await cache.registerSegment('s1');
  await cache.registerSegment('s2');
  await cache.registerSegments(['s2', 's3', 's4']);

  const segments = await cache.getRegisteredSegments();

  ['s1', 's2', 's3', 's4'].forEach(s => expect(segments.indexOf(s) !== -1).toBe(true));

  await connection.quit();
});
