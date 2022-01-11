import { whitelistTransform } from '../whitelist';

test('TRANSFORMS / a whitelist Array should be casted into a Set', function () {
  let sample = {
    whitelist: [
      'u1',
      'u2',
      'u3'
    ]
  };

  let sampleSet = whitelistTransform(sample);

  sample.whitelist.forEach(item => {
    if (!sampleSet.has(item)) {
      throw new Error(`Missing item ${item}`);
    }
  });

  // @ts-ignore
  sampleSet = whitelistTransform({});
  expect(sampleSet.size).toBe(0); // Empty Set if passed an object without a whitelist

  expect(true).toBe(true); // Everything looks fine
});
