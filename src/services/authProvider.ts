import { IFetchAuth, NetworkError } from './types';
import { IJwtCredential } from '../sync/streaming/AuthClient/types';
import { authenticateFactory } from '../sync/streaming/AuthClient';
import { Backoff } from '../utils/Backoff';
import { ILogger } from '../logger/types';
import { LOG_PREFIX_SYNC_AUTH } from '../logger/constants';

const SKEW_SECONDS = 30;

function isExpired(credential: IJwtCredential): boolean {
  return Date.now() / 1000 + SKEW_SECONDS >= credential.expiresAt;
}

export interface IAuthProvider {
	credential(): Promise<IJwtCredential>;
	invalidate(): void;
	stop(): void;
}

/**
 * Factory of AuthProvider, which provides JWT credentials for authenticated HTTP requests.
 * Credentials are fetched lazily on demand, cached in memory, and retried with backoff on failure.
 */
export function authProviderFactory(fetchAuth: IFetchAuth, log: ILogger): IAuthProvider {

  const authenticate = authenticateFactory(fetchAuth);
  const backoff = new Backoff(fetchCredential);

  let cachedCredential: IJwtCredential | undefined;
  let inFlightPromise: Promise<IJwtCredential> | undefined;
  let stopped = false;

  function fetchCredential(): Promise<IJwtCredential> {
    return authenticate().then(credential => {
      log.info(LOG_PREFIX_SYNC_AUTH + 'credential fetched successfully');
      cachedCredential = credential;
      inFlightPromise = undefined;
      backoff.reset();
      return credential;
    }).catch((error: NetworkError) => {
      // Avoid rejected promises and unnecessary retries after stop()
      if (stopped) return cachedCredential!;

      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        log.error(LOG_PREFIX_SYNC_AUTH + 'non-retryable error fetching credential (status ' + error.statusCode + '): ' + error.message);
        inFlightPromise = undefined;
        throw error;
      }

      log.warn(LOG_PREFIX_SYNC_AUTH + 'credential fetch failed (attempt ' + (backoff.attempts + 1) + '). Error: ' + error.message);
      return backoff.scheduleCallAsync();
    });
  }

  return {
    credential(): Promise<IJwtCredential> {
      if (cachedCredential && !isExpired(cachedCredential)) {
        return Promise.resolve(cachedCredential);
      }

      if (cachedCredential) log.debug(LOG_PREFIX_SYNC_AUTH + 'cached credential expired');

      return inFlightPromise || (inFlightPromise = fetchCredential());
    },

    invalidate() {
      cachedCredential = undefined;
    },

    stop() {
      stopped = true;
      cachedCredential = undefined;
      inFlightPromise = undefined;
      backoff.reset();
    }
  };
}
