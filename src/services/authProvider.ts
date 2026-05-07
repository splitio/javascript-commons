import { IFetchAuth, NetworkError } from './types';
import { IJwtCredential } from '../sync/streaming/AuthClient/types';
import { authenticateFactory } from '../sync/streaming/AuthClient';
import { Backoff } from '../utils/Backoff';

const SKEW_SECONDS = 30;
const MAX_RETRIES = 10;
const BACKOFF_BASE = 10000; // 10 seconds
const BACKOFF_MAX = 30000; // 30 seconds

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
export function authProviderFactory(fetchAuth: IFetchAuth): IAuthProvider {

  const authenticate = authenticateFactory(fetchAuth);
  const backoff = new Backoff(fetchCredential, BACKOFF_BASE, BACKOFF_MAX);

  let cachedCredential: IJwtCredential | undefined;
  let inFlightPromise: Promise<IJwtCredential> | undefined;
  let retryCount = 0;
  let stopped = false;

  function fetchCredential(): Promise<IJwtCredential> {
    return authenticate().then(credential => {
      cachedCredential = credential;
      inFlightPromise = undefined;
      retryCount = 0;
      backoff.reset();
      return credential;
    }).catch((error: NetworkError) => {
      // Avoid rejected promises and unnecessary retries after stop()
      if (stopped) return cachedCredential!;

      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        inFlightPromise = undefined;
        retryCount = 0;
        throw error;
      }

      if (retryCount >= MAX_RETRIES) {
        inFlightPromise = undefined;
        retryCount = 0;
        backoff.reset();
        // @TODO: 2-hour cooldown before allowing next attempt
        throw error;
      }

      retryCount++;
      return backoff.scheduleCallAsync();
    });
  }

  return {
    credential(): Promise<IJwtCredential> {
      if (cachedCredential && !isExpired(cachedCredential)) {
        return Promise.resolve(cachedCredential);
      }

      return inFlightPromise || (inFlightPromise = fetchCredential());
    },

    invalidate() {
      cachedCredential = undefined;
    },

    stop() {
      stopped = true;
      cachedCredential = undefined;
      inFlightPromise = undefined;
      retryCount = 0;
      backoff.reset();
    }
  };
}
