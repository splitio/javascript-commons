import fs from 'fs';
import rl from 'readline';
import * as murmur3 from '../murmur3';
import { hash128 } from '../murmur3_128';
import { hash64 } from '../murmur3_64';

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

function dec2hex(str: any) {
  let sum = [];
  const dec = str.toString().split('');
  const hex = [];
  while (dec.length) {
    let s = 1 * dec.shift();
    for (let i = 0; s || i < sum.length; i++) {
      s += (sum[i] || 0) * 10;
      sum[i] = s % 16;
      s = (s - sum[i]) / 16;
    }
  }
  while (sum.length) {
    hex.push((sum.pop() as any).toString(16));
  }
  return hex.join('');
}

[
  'murmur3_64_uuids.csv',
].forEach(filename => {

  test('MURMUR3 128 / validate hashing behavior using sample data', (done) => {
    const parser = rl.createInterface({
      terminal: false,
      input: fs.createReadStream(require.resolve(`./mocks/${filename}`))
    });

    parser
      .on('line', line => {
        const parts = line.split(',');

        if (parts.length === 3) {
          let key = parts[0];
          let seed = parseInt(parts[1], 10);
          let hash = parts[2];
          const result = hash128(key, seed);

          expect(result.substring(0, 16)).toBe(dec2hex(hash).padStart(16, '0'));
        }
      })
      .on('close', done);
  }, 30000); // timeout of 30 seconds, since this test can take more time when reporting test coverage
});

test('MURMUR3 128 higher 64 bits', () => {

  [
    ['key1', { hex: '15d67461d2044fb3', dec: '1573573083296714675' }],
    ['key2', { hex: '75b93494ef690e31', dec: '8482869187405483569' }],
    ['key3', { hex: '6f76f1df6ac38fea', dec: '8031872927333060586' }],
    ['key4', { hex: '5ec727b58617b474', dec: '6829471020522910836' }],
    ['key5', { hex: 'b07087d10f0143b8', dec: '12713811080036565944' }],
    ['key6', { hex: 'ddcd11333e54c85c', dec: '15982449564394506332' }],
    ['', { hex: '0000000000000000', dec: '0' }],
  ].forEach(([key, hash]) => {
    expect(hash64(key as string)).toEqual(hash);
  });
});
