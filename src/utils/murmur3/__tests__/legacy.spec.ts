// @ts-nocheck
import * as utils from '../legacy';
import csv from 'csv-streamify';
import fs from 'fs';

test('ENGINE / validate hashing behavior using sample data', (done) => {
  let parser = csv({ objectMode: false });

  parser.on('data', (line) => {
    let [seed, key, hash, bucket] = JSON.parse(line.toString('utf8').trim());

    seed = parseInt(seed, 10);
    hash = parseInt(hash, 10);
    bucket = parseInt(bucket, 10);

    expect(utils.hash(key, seed)).toBe(hash); // matching using int32 hash value
    expect(utils.bucket(key, seed)).toBe(bucket); // matching using int32 bucket value
  }).on('end', done);

  fs.createReadStream(require.resolve('./mocks/small-data.csv')).pipe(parser);
});
