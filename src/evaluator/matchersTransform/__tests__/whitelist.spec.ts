import { whitelistTransform } from '../whitelist';

test('TRANSFORMS / the whitelist array should be extracted', () => {
  let sample = {
    whitelist: [
      'u1',
      'u2',
      'u3'
    ]
  };

  expect(whitelistTransform(sample)).toEqual(sample.whitelist);

  // @ts-ignore
  expect(whitelistTransform({ whitelist: null })).toBe(null); // Empty Set if passed an object without a whitelist

  expect(whitelistTransform(null)).toBe(null); // Everything looks fine
});
