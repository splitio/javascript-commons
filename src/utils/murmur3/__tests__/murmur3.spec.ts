import fs from 'fs';
import rl from 'readline';
import * as murmur3 from '../murmur3';

[
  'murmur3-sample-v4.csv',
  'murmur3-sample-v3.csv',
  'murmur3-sample-data-v2.csv',
  'murmur3-sample-data-non-alpha-numeric-v2.csv',
  'murmur3-sample-double-treatment-users.csv'
].forEach(filename => {

  test('MURMUR3 32 / validate hashing behavior using sample data', (done) => {
    const parser = rl.createInterface({
      terminal: false,
      input: fs.createReadStream(require.resolve(`./mocks/${filename}`))
    });

    parser
      .on('line', line => {
        const parts = line.toString().split(',');

        if (parts.length === 4) {

          let seed = parseInt(parts[0], 10);
          let key = parts[1];
          let hash = parseInt(parts[2], 10);
          let bucket = parseInt(parts[3], 10);

          expect(murmur3.hash(key, seed)).toBe(hash);
          expect(murmur3.bucket(key, seed)).toBe(bucket);
        }
      })
      .on('close', done);
  }, 30000); // timeout of 30 seconds, since this test can take more time when reporting test coverage

});
