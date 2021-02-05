import fs from 'fs';
import rl from 'readline';
import { hash128 } from '../murmur3_128';

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
