import { IFetch, IRequestOptions, IResponse, ISplitHttpClient, NetworkError } from './types';
import { objectAssign } from '../utils/lang/objectAssign';
import { ERROR_HTTP, ERROR_CLIENT_CANNOT_GET_READY } from '../logger/constants';
import { ISettings } from '../types';

const messageNoFetch = 'Global fetch API is not available.';

/**
 * Factory of Split HTTP clients, which are HTTP clients with predefined headers for Split endpoints.
 *
 * @param settings SDK settings, used to access authorizationKey, logger instance and metadata (SDK version, ip and hostname) to set additional headers
 * @param options global request options
 * @param fetch optional http client to use instead of the global Fetch (for environments where Fetch API is not available such as Node)
 */
export function splitHttpClientFactory(settings: Pick<ISettings, 'log' | 'version' | 'runtime' | 'core'>, getFetch?: () => (IFetch | undefined), getOptions?: () => object): ISplitHttpClient {

  const { log, core: { authorizationKey }, version, runtime: { ip, hostname } } = settings;
  const options = getOptions && getOptions();
  const fetch = getFetch && getFetch();

  // if fetch is not available, log Error
  if (!fetch) log.error(ERROR_CLIENT_CANNOT_GET_READY, [messageNoFetch]);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authorizationKey}`,
    'SplitSDKVersion': version
  };

  if (ip) headers['SplitSDKMachineIP'] = ip;
  if (hostname) headers['SplitSDKMachineName'] = hostname;

  return function httpClient(url: string, reqOpts: IRequestOptions = {}, latencyTracker: (error?: NetworkError) => void = () => { }, logErrorsAsInfo: boolean = false): Promise<IResponse> {

    const request = objectAssign({
      headers: reqOpts.headers ? objectAssign({}, headers, reqOpts.headers) : headers,
      method: reqOpts.method || 'GET',
      body: reqOpts.body
    }, options);

    // using `fetch(url, options)` signature to work with unfetch, a lightweight ponyfill of fetch API.
    return fetch ? fetch(url, request)
      // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Checking_that_the_fetch_was_successful
      .then(response => {
        if (!response.ok) {
          return response.text().then(message => Promise.reject({ response, message }));
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
          log[logErrorsAsInfo ? 'info' : 'error'](ERROR_HTTP, [resp ? resp.status : 'NO_STATUS', url, msg]);
        }

        const networkError: NetworkError = new Error(msg);
        // passes `undefined` as statusCode if not an HTTP error (resp === undefined)
        networkError.statusCode = resp && resp.status;

        latencyTracker(networkError);
        throw networkError;
      }) : Promise.reject(new Error(messageNoFetch));
  };
}
