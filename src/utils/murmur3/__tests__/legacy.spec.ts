// @ts-nocheck
import * as utils from '../legacy';
import { readCSV } from '../../../__tests__/testUtils/csv';

test('ENGINE / validate hashing behavior using sample data', async () => {
  const lines = await readCSV(require.resolve('./mocks/small-data.csv'));

  for (let [seed, key, hash, bucket] of lines) {
    seed = parseInt(seed, 10);
    hash = parseInt(hash, 10);
    bucket = parseInt(bucket, 10);

    expect(utils.hash(key, seed)).toBe(hash); // matching using int32 hash value
    expect(utils.bucket(key, seed)).toBe(bucket); // matching using int32 bucket value
  }
});
