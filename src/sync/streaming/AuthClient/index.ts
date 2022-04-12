import { IFetchAuth } from '../../../services/types';
import { IAuthenticate, IAuthToken } from './types';
import { objectAssign } from '../../../utils/lang/objectAssign';
import { encodeToBase64 } from '../../../utils/base64';
import { decodeJWTtoken } from '../../../utils/jwt';
import { hash } from '../../../utils/murmur3/murmur3';

/**
 * Factory of authentication function.
 *
 * @param fetchAuth `SplitAPI.fetchAuth` endpoint
 */
export function authenticateFactory(fetchAuth: IFetchAuth): IAuthenticate {

  /**
   * Run authentication requests to Auth Server, and returns a promise that resolves with the decoded JTW token.
   * @param {string[] | undefined} userKeys set of user Keys to track MY_SEGMENTS_CHANGES. It is undefined for server-side API.
   */
  return function authenticate(userKeys?: string[]): Promise<IAuthToken> {
    return fetchAuth(userKeys)
      .then(resp => resp.json())
      .then(json => {
        if (json.token) { // empty token when `"pushEnabled": false`
          const decodedToken = decodeJWTtoken(json.token);
          if (typeof decodedToken.iat !== 'number' || typeof decodedToken.exp !== 'number') throw new Error('token properties "issuedAt" (iat) or "expiration" (exp) are missing or invalid');
          const channels = JSON.parse(decodedToken['x-ably-capability']);
          return objectAssign({
            decodedToken,
            channels
          }, json);
        }
        return json;
      });
  };
}

/**
 * Returns the hash of a given user key
 */
export function hashUserKey(userKey: string): string {
  return encodeToBase64(hash(userKey, 0).toString());
}
