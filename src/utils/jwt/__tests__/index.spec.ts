import { jwtSample, decodedJwtPayloadSample } from '../../../sync/streaming/__tests__/dataMocks';
import { decodeJWTtoken } from '..';

test('decodeJWTtoken', () => {
  expect(decodeJWTtoken(jwtSample)).toEqual(decodedJwtPayloadSample); // decodes JWT token
});
