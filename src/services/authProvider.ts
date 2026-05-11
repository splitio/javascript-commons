import { ISplitHttpClient, NetworkError } from './types';
import { IJwtCredentialV3 } from '../sync/streaming/AuthClient/types';
import { authenticateFactory } from '../sync/streaming/AuthClient';
import { Backoff } from '../utils/Backoff';
import { LOG_PREFIX_SYNC_AUTH } from '../logger/constants';
import { ISettings } from '../types';
import { TOKEN } from '../utils/constants';
import { ITelemetryTracker } from '../trackers/types';

const SKEW_SECONDS = 30;

function isExpired(credential: IJwtCredentialV3): boolean {
  return Date.now() / 1000 + SKEW_SECONDS >= credential.decodedToken.exp;
}

export interface IAuthProvider {
  credential(): Promise<IJwtCredentialV3>;
  invalidate(): void;
  stop(): void;
}

/**
 * Factory of AuthProvider, which provides JWT credentials for authenticated HTTP requests.
 * Credentials are fetched lazily on demand, cached in memory, and retried with backoff on failure.
 */
export function authProviderFactory(settings: ISettings, splitHttpClient: ISplitHttpClient, telemetryTracker: ITelemetryTracker): IAuthProvider {

  const { urls, log } = settings;

  function fetchAuth() {
    let url = `${urls.auth}/v3/auth?capabilities=config`;
    return splitHttpClient(url, undefined, telemetryTracker.trackHttp(TOKEN));
  }

  const authenticate = authenticateFactory(fetchAuth);
  const backoff = new Backoff(fetchCredential);

  let cachedCredential: IJwtCredentialV3 | undefined;
  let inFlightPromise: Promise<IJwtCredentialV3> | undefined;
  let stopped = false;

  function fetchCredential(): Promise<IJwtCredentialV3> {
    return authenticate().then((credential: IJwtCredentialV3) => {
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
    credential(): Promise<IJwtCredentialV3> {
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
