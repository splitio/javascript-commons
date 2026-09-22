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
      if (stopped || (cachedCredential && !isExpired(cachedCredential))) {
        return Promise.resolve(cachedCredential!);
      }

      if (cachedCredential) log.debug(LOG_PREFIX_SYNC_AUTH + 'cached credential expired');

      return inFlightPromise || (inFlightPromise = fetchCredential());
    },

    invalidate() {
      cachedCredential = undefined;
    },

    stop() {
      stopped = true;
      inFlightPromise = undefined;
      // Keep any already-cached credential usable (e.g. by a final flush on destroy).
      // Pass it to reset() so a pending retry's promise settles with it immediately.
      backoff.reset(cachedCredential);
    }
  };
}
