import { base64sample, decodedBase64sample } from '../../../sync/streaming/__tests__/dataMocks';

import { encodeToBase64, decodeFromBase64 } from '../index';

test('encodeToBase64', () => {

  expect(encodeToBase64(decodedBase64sample)).toBe(base64sample); // encodes string to base64
});

test('decodeFromBase64', () => {

  expect(decodeFromBase64(base64sample)).toBe(decodedBase64sample); // decodes base64 string
});
