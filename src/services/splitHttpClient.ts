import { IRequestOptions, IResponse, ISplitHttpClient, NetworkError } from './types';
import { objectAssign } from '../utils/lang/objectAssign';
import { ERROR_HTTP, ERROR_CLIENT_CANNOT_GET_READY } from '../logger/constants';
import { ISettings } from '../types';
import { IPlatform } from '../sdkFactory/types';
import { decorateHeaders, removeNonISO88591 } from './decorateHeaders';
import { timeout } from '../utils/promise/timeout';

const PENDING_FETCH_ERROR_TIMEOUT = 100;
const messageNoFetch = 'Global fetch API is not available.';

/**
 * Factory of Split HTTP clients, which are HTTP clients with predefined headers for Split endpoints.
 *
 * @param settings - SDK settings, used to access authorizationKey, logger instance and metadata (SDK version, ip and hostname) to set additional headers
 * @param platform - object containing environment-specific dependencies
 */
export function splitHttpClientFactory(settings: ISettings, { getOptions, getFetch }: Pick<IPlatform, 'getOptions' | 'getFetch'>): ISplitHttpClient {

  const { log, core: { authorizationKey }, version, runtime: { ip, hostname } } = settings;
  const options = getOptions && getOptions(settings);
  const fetch = getFetch && getFetch(settings);

  // if fetch is not available, log Error
  if (!fetch) log.error(ERROR_CLIENT_CANNOT_GET_READY, [messageNoFetch]);

  const commonHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authorizationKey}`,
    'SplitSDKVersion': version
  };

  if (ip) commonHeaders['SplitSDKMachineIP'] = ip;
  if (hostname) commonHeaders['SplitSDKMachineName'] = removeNonISO88591(hostname);

  return function httpClient(url: string, reqOpts: IRequestOptions = {}, latencyTracker: (error?: NetworkError) => void = () => { }, logErrorsAsInfo: boolean = false): Promise<IResponse> {

    const request = objectAssign({
      headers: decorateHeaders(settings, objectAssign({}, commonHeaders, reqOpts.headers || {})),
      method: reqOpts.method || 'GET',
      body: reqOpts.body
    }, options);

    // using `fetch(url, options)` signature to work with unfetch, a lightweight ponyfill of fetch API.
    return fetch ? fetch(url, request)
      // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Checking_that_the_fetch_was_successful
      .then(response => {
        if (!response.ok) {
          // timeout since `text()` promise might not settle in some fetch implementations and cases (e.g. no content)
          return timeout(PENDING_FETCH_ERROR_TIMEOUT, response.text()).then(message => Promise.reject({ response, message }), () => Promise.reject({ response }));
        }
        latencyTracker();
        return response;
      })
      .catch(error => {
        const resp = error && error.response;
        let msg = '';

        if (resp) { // An HTTP error
          switch (resp.status) {
            case 404: msg = 'Invalid SDK key or resource not found.';
              break;
            // Don't use resp.statusText since reason phrase is removed in HTTP/2
            default: msg = error.message;
              break;
          }
        } else { // Something else, either an error making the request or a Network error.
          msg = error.message || 'Network Error';
        }

        if (!resp || resp.status !== 403) { // 403's log we'll be handled somewhere else.
          log[logErrorsAsInfo ? 'info' : 'error'](ERROR_HTTP, [resp ? 'status code ' + resp.status : 'no status code', url, msg]);
        }

        const networkError: NetworkError = new Error(msg);
        // passes `undefined` as statusCode if not an HTTP error (resp === undefined)
        networkError.statusCode = resp && resp.status;

        latencyTracker(networkError);
        throw networkError;
      }) : Promise.reject(new Error(messageNoFetch));
  };
}
