import { ISplitHttpClient, NetworkError } from './types';
import { IJwtCredential } from '../sync/streaming/AuthClient/types';
import { fetchAuthFactory } from '../sync/streaming/AuthClient';
import { Backoff } from '../utils/Backoff';
import { LOG_PREFIX_SYNC_AUTH } from '../logger/constants';
import { ISettings } from '../types';
import { TOKEN } from '../utils/constants';
import { ITelemetryTracker } from '../trackers/types';

const SKEW_SECONDS = 30;

function isExpired(credential: IJwtCredential): boolean {
  return Date.now() / 1000 + SKEW_SECONDS >= credential.decodedToken.exp;
}

function noCachedCredentialError() {
  return new Error(LOG_PREFIX_SYNC_AUTH + 'stopped without a cached credential');
}

export interface IAuthProvider {
  /**
   * Returns the cached credential, or fetches a new one if there isn't one cached or it's expired,
   * retrying with backoff on recoverable errors. Used by `secureSplitHttpClient` and `serviceApi.fetchAuth`.
   */
  credential(): Promise<IJwtCredential>;
  /**
   * Invalidates/clears the cached credential. Used by `secureSplitHttpClient` in the special case of 401 error,
   * and by `serviceApi.fetchAuth` to force a credential/token refresh.
   */
  invalidate(): void;
  stop(): void;
}

/**
 * Factory of AuthProvider, which provides JWT credentials for authenticated HTTP requests.
 * Credentials are fetched lazily on demand, cached in memory, and retried with backoff on failure.
 */
export function authProviderFactory(settings: ISettings, splitHttpClient: ISplitHttpClient, telemetryTracker: ITelemetryTracker): IAuthProvider {

  const { urls, log } = settings;

  const fetchAuth = fetchAuthFactory(() => {
    let url = `${urls.auth}/api/v3/auth?capabilities=config,aiconfig`;
    return splitHttpClient(url, undefined, telemetryTracker.trackHttp(TOKEN), false, true);
  });
  const backoff = new Backoff(fetchCredential);

  let cachedCredential: IJwtCredential | undefined;
  let inFlightPromise: Promise<IJwtCredential> | undefined;
  let stopped = false;

  function fetchCredential(): Promise<IJwtCredential> {
    return fetchAuth().then((credential: IJwtCredential) => {
      log.info(LOG_PREFIX_SYNC_AUTH + 'credential fetched successfully');
      cachedCredential = credential;
      inFlightPromise = undefined;
      backoff.reset();
      return credential;
    }).catch((error: NetworkError) => {
      // Avoid unnecessary retries after stop(): fall back to any cached credential, or reject
      // (never resolve with `undefined`, which callers would otherwise send as an unauthenticated request).
      if (stopped) return cachedCredential || Promise.reject(noCachedCredentialError());

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

      // Reuse any fetch already in flight (e.g. one started just before stop()), instead of firing a redundant one.
      if (inFlightPromise) return inFlightPromise;

      // No cached credential to fall back to and stopped: reject so callers don't send an unauthenticated request.
      if (stopped && !cachedCredential) {
        return Promise.reject(noCachedCredentialError());
      }

      if (cachedCredential) log.debug(LOG_PREFIX_SYNC_AUTH + 'cached credential expired');

      // If stopped, this is a last, bounded refetch: fetchCredential()'s catch short-circuits (no backoff retry)
      // once stopped, so it's a single attempt that falls back to the stale cached credential on failure.
      return inFlightPromise = fetchCredential();
    },

    invalidate() {
      cachedCredential = undefined;
    },

    stop() {
      stopped = true;
      // Keep any in-flight fetch and already-cached credential usable (e.g. by a final flush on destroy).
      // If a retry is only pending (not actively in flight), settle it immediately instead of waiting out the
      // backoff delay: with the cached credential if there is one, or rejected otherwise.
      backoff.reset(cachedCredential ? { value: cachedCredential } : { error: noCachedCredentialError() });
    }
  };
}
