import { ISplitHttpClient, NetworkError } from './types';
import { IJwtCredential } from './types';
import { fetchAuthFactory } from './fetchAuth';
import { Backoff } from '../utils/Backoff';
import { LOG_PREFIX_SYNC_AUTH } from '../logger/constants';
import { ISettings } from '../types';
import { TOKEN } from '../utils/constants';
import { ITelemetryTracker } from '../trackers/types';

const SKEW_SECONDS = 30;

function isExpired(credential: IJwtCredential): boolean {
  return Date.now() / 1000 + SKEW_SECONDS >= credential.decodedToken.exp;
}

/**
 * Builds the `key` query params for the `/api/v3/auth` endpoint: one `&key=<userKey>` per unique user key,
 * sorted so that the same set of keys always maps to the same query (and thus to the same cached credential).
 */
function userKeysToQueryParams(userKeys: string[]): string {
  return userKeys
    .filter((userKey, index) => userKeys.indexOf(userKey) === index)
    .sort()
    .map(userKey => '&key=' + encodeURIComponent(userKey))
    .join('');
}

function noCachedCredentialError() {
  return new Error(LOG_PREFIX_SYNC_AUTH + 'stopped without a cached credential');
}

export interface IAuthProvider {
  /**
   * Returns the cached credential, or fetches a new one if there isn't one cached, it's expired, or it was fetched
   * for a different set of user keys, retrying with backoff on recoverable errors. Used by `secureSplitHttpClient` and `serviceApi.fetchAuth`.
   *
   * @param userKeys - optional set of user keys, sent as `key` query params to the `/api/v3/auth` endpoint so that the
   * credential covers their membership channels. Only provided by `serviceApi.fetchAuth` in client-side (undefined in server-side).
   * It is remembered, so that subsequent calls without `userKeys` (e.g., by `secureSplitHttpClient`) reuse the same credential.
   */
  credential(userKeys?: string[]): Promise<IJwtCredential>;
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

  // `key` query params of the latest user keys, and of the in-flight and cached credentials respectively
  let userKeysQueryParams = '';
  let inFlightQueryParams = '';
  let cachedQueryParams = '';

  const fetchAuth = fetchAuthFactory(() => {
    let url = `${urls.auth}/api/v3/auth?capabilities=config,aiconfig${inFlightQueryParams}`;
    return splitHttpClient(url, undefined, telemetryTracker.trackHttp(TOKEN), false, true);
  });
  const backoff = new Backoff(fetchCredential);

  let cachedCredential: IJwtCredential | undefined;
  let inFlightPromise: Promise<IJwtCredential> | undefined;
  let stopped = false;

  function fetchCredential(): Promise<IJwtCredential> {
    // Snapshot the latest user keys, so that backoff retries also pick up keys added in the meantime
    const queryParams = inFlightQueryParams = userKeysQueryParams;

    return fetchAuth().then((credential: IJwtCredential) => {
      log.info(LOG_PREFIX_SYNC_AUTH + 'credential fetched successfully');
      cachedCredential = credential;
      cachedQueryParams = queryParams;
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

  const provider: IAuthProvider = {
    credential(userKeys?: string[]): Promise<IJwtCredential> {
      if (userKeys) userKeysQueryParams = userKeysToQueryParams(userKeys);

      if (cachedCredential && cachedQueryParams === userKeysQueryParams && !isExpired(cachedCredential)) {
        return Promise.resolve(cachedCredential);
      }

      if (inFlightPromise) {
        // Reuse any fetch already in flight (e.g. one started just before stop()), instead of firing a redundant one.
        if (inFlightQueryParams === userKeysQueryParams) return inFlightPromise;

        // The in-flight fetch is for a different set of user keys: wait for it to settle, and then re-evaluate.
        const retry = () => provider.credential();
        return inFlightPromise.then(retry, retry);
      }

      // No cached credential to fall back to and stopped: reject so callers don't send an unauthenticated request.
      if (stopped && !cachedCredential) {
        return Promise.reject(noCachedCredentialError());
      }

      if (cachedCredential) log.debug(LOG_PREFIX_SYNC_AUTH + (cachedQueryParams === userKeysQueryParams ? 'cached credential expired' : 'user keys changed'));

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

  return provider;
}
