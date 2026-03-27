import { IRequestOptions, IResponse, ISplitHttpClient, NetworkError, ISecureSplitHttpClient } from './types';
import { objectAssign } from '../utils/lang/objectAssign';
import { ERROR_HTTP, ERROR_CLIENT_CANNOT_GET_READY } from '../logger/constants';
import { ISettings } from '../types';
import { IPlatform } from '../sdkFactory/types';
import { decorateHeaders, removeNonISO88591 } from './decorateHeaders';
import { splitHttpClientFactory } from './splitHttpClient';
import { timeout } from '../utils/promise/timeout';
import { decodeJWTtoken } from '../utils/jwt';
import { SECONDS_BEFORE_EXPIRATION } from '../sync/streaming/constants';
import { IAuthToken } from '../sync/streaming/AuthClient/types';

const PENDING_FETCH_ERROR_TIMEOUT = 100;
const messageNoFetch = 'Global fetch API is not available.';

/**
 * Creates an auth data manager that transparently handles JWT credential lifecycle:
 * fetching, caching, expiry checks, invalidation, and deduplication of concurrent requests.
 *
 * @param innerHttpClient - standard HTTP client (authenticated with SDK key) used to call the auth endpoint
 * @param settings - SDK settings, used to build the auth endpoint URL
 */
function authDataManagerFactory(innerHttpClient: ISplitHttpClient, settings: ISettings) {
  let currentToken: IAuthToken | null = null;
  let pendingRequest: Promise<IAuthToken> | null = null;

  function fetchToken(): Promise<IAuthToken> {
    const url = settings.urls.auth + '/v2/auth?s=' + settings.sync.flagSpecVersion;
    return innerHttpClient(url)
      .then(function (resp) { return resp.json(); })
      .then(function (json) {
        let authToken: IAuthToken;
        if (json.token) {
          const decodedToken = decodeJWTtoken(json.token);
          if (typeof decodedToken.iat !== 'number' || typeof decodedToken.exp !== 'number') {
            throw new Error('token properties "issuedAt" (iat) or "expiration" (exp) are missing or invalid');
          }
          const channels = JSON.parse(decodedToken['x-ably-capability']);
          authToken = objectAssign({ decodedToken, channels }, json) as IAuthToken;
        } else {
          authToken = json as IAuthToken;
        }
        currentToken = authToken;
        return authToken;
      });
  }

  function isExpired(token: IAuthToken): boolean {
    // Consider token expired SECONDS_BEFORE_EXPIRATION (600s) before actual expiry,
    // so that proactive refresh (e.g., for streaming) gets a fresh token
    return !token.pushEnabled || Date.now() / 1000 >= token.decodedToken.exp - SECONDS_BEFORE_EXPIRATION;
  }

  return {
    getAuthData(): Promise<IAuthToken> {
      // Return cached token if valid and not expired
      if (currentToken && !isExpired(currentToken)) {
        return Promise.resolve(currentToken);
      }

      // Deduplicate concurrent requests
      if (pendingRequest) return pendingRequest;

      pendingRequest = fetchToken().then(
        function (token) {
          pendingRequest = null;
          return token;
        },
        function (error) {
          pendingRequest = null;
          throw error;
        }
      );

      return pendingRequest;
    },

    // Internal: used by the secure HTTP client on 401 to force a fresh token
    invalidate() {
      currentToken = null;
    }
  };
}

/**
 * Factory of Secure Split HTTP clients. Like `splitHttpClientFactory`, but transparently
 * manages JWT authentication: obtains a JWT from the auth endpoint (using the SDK key internally),
 * caches it, and retries once on 401 responses with a fresh token.
 *
 * @param settings - SDK settings
 * @param platform - object containing environment-specific dependencies
 * @returns an object with `httpClient` (ISplitHttpClient) and `getAuthData` to retrieve current auth token
 */
export function secureSplitHttpClientFactory(
  settings: ISettings,
  platform: Pick<IPlatform, 'getOptions' | 'getFetch'>
): ISecureSplitHttpClient {

  const { getOptions, getFetch } = platform;
  const { log, version, runtime: { ip, hostname } } = settings;
  const options = getOptions && getOptions(settings);
  const fetch = getFetch && getFetch(settings);

  // if fetch is not available, log Error
  if (!fetch) log.error(ERROR_CLIENT_CANNOT_GET_READY, [messageNoFetch]);

  const commonHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'SplitSDKVersion': version
  };

  if (ip) commonHeaders['SplitSDKMachineIP'] = ip;
  if (hostname) commonHeaders['SplitSDKMachineName'] = removeNonISO88591(hostname);

  // Inner standard HTTP client for auth endpoint calls (authenticates with SDK key)
  const innerHttpClient = splitHttpClientFactory(settings, platform);
  const authDataManager = authDataManagerFactory(innerHttpClient, settings);

  function doFetch(url: string, request: Record<string, any>): Promise<IResponse> {
    return fetch!(url, request)
      .then(function (response) {
        if (!response.ok) {
          return timeout(PENDING_FETCH_ERROR_TIMEOUT, response.text()).then(
            function (message) { return Promise.reject({ response: response, message: message }); },
            function () { return Promise.reject({ response: response }); }
          );
        }
        return response;
      });
  }

  function buildRequest(reqOpts: IRequestOptions, authToken: string): Record<string, any> {
    const headers = objectAssign({}, commonHeaders, { 'Authorization': 'Bearer ' + authToken }, reqOpts.headers || {});
    return objectAssign({
      headers: decorateHeaders(settings, headers),
      method: reqOpts.method || 'GET',
      body: reqOpts.body
    }, options);
  }

  function handleError(error: any, url: string, logErrorsAsInfo: boolean): NetworkError {
    const resp = error && error.response;
    let msg = '';

    if (resp) {
      switch (resp.status) {
        case 404: msg = 'Invalid SDK key or resource not found.';
          break;
        default: msg = error.message;
          break;
      }
    } else {
      msg = error.message || 'Network Error';
    }

    if (!resp || resp.status !== 403) {
      log[logErrorsAsInfo ? 'info' : 'error'](ERROR_HTTP, [resp ? 'status code ' + resp.status : 'no status code', url, msg]);
    }

    const networkError: NetworkError = new Error(msg);
    networkError.statusCode = resp && resp.status;
    return networkError;
  }

  function httpClient(url: string, reqOpts: IRequestOptions = {}, latencyTracker: (error?: NetworkError) => void = function () { }, logErrorsAsInfo: boolean = false): Promise<IResponse> {
    if (!fetch) return Promise.reject(new Error(messageNoFetch));

    return authDataManager.getAuthData()
      .then(function (authToken) {
        const request = buildRequest(reqOpts, authToken.token);
        return doFetch(url, request)
          .then(function (response) {
            latencyTracker();
            return response;
          })
          .catch(function (error) {
            const resp = error && error.response;

            // On 401, invalidate credential and retry once with a fresh token
            if (resp && resp.status === 401) {
              authDataManager.invalidate();
              return authDataManager.getAuthData()
                .then(function (freshToken) {
                  const retryRequest = buildRequest(reqOpts, freshToken.token);
                  return doFetch(url, retryRequest)
                    .then(function (response) {
                      latencyTracker();
                      return response;
                    });
                });
            }

            throw error;
          });
      })
      .catch(function (error) {
        const networkError = handleError(error, url, logErrorsAsInfo);
        latencyTracker(networkError);
        throw networkError;
      });
  }

  return {
    httpClient: httpClient,
    getAuthData: authDataManager.getAuthData
  };
}
