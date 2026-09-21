import { IJwtCredential, IFetchAuth } from './types';
import { objectAssign } from '../../../utils/lang/objectAssign';
import { decodeJWTtoken } from '../../../utils/jwt';
import { IResponse } from '../../../services/types';

/**
 * Factory of authentication function.
 *
 * @param fetchAuth - /auth endpoint
 */
export function fetchAuthFactory(fetchAuth: (userKeys?: string[]) => Promise<IResponse>): IFetchAuth {

  /**
   * Run authentication requests to Auth Server, and returns a promise that resolves with the decoded JTW token.
   * @param userKeys - set of user Keys to track membership updates. It is undefined for server-side API.
   */
  return function authenticate(userKeys?: string[]): Promise<IJwtCredential> {
    return fetchAuth(userKeys)
      .then(resp => resp.json())
      .then(json => {
        if (json.token) { // empty token when `"pushEnabled": false`
          const decodedToken = decodeJWTtoken(json.token);
          if (typeof decodedToken.iat !== 'number' || typeof decodedToken.exp !== 'number') throw new Error('token properties "issuedAt" (iat) or "expiration" (exp) are missing or invalid');
          const channels = JSON.parse(decodedToken['x-ably-capability']);
          const credential = objectAssign({
            decodedToken,
            channels
          }, json);
          // The `/api/v3/auth` endpoint nests the streaming settings under `config.streaming`. Normalize
          // them into the flat `pushEnabled`/`connDelay` properties used by the PushManager.
          const streaming = credential.config && credential.config.streaming;
          if (streaming) {
            credential.pushEnabled = streaming.enabled;
            credential.connDelay = streaming.delay;
          }
          return credential;
        }
        return json;
      });
  };
}
