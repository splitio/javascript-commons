import { IFetch, ISplitHttpClient } from './types';
import { SplitError, SplitNetworkError } from '../utils/lang/errors';
import objectAssign from 'object-assign';
import { IMetadata } from '../dtos/types';
import { ILogger } from '../logger/types';
// import { logFactory } from '../logger/sdkLogger';
// const log = logFactory('splitio-services:service');

const messageNoFetch = 'Global fetch API is not available.';

/**
 * Factory of Split HTTP clients, which are HTTP clients with predefined headers for Split endpoints.
 *
 * @param apikey api key to set Authorization header
 * @param metadata data to set additional headers
 * @param options global request options
 * @param fetch optional http client to use instead of the global Fetch (for environments where Fetch API is not available such as Node)
 */
export function splitHttpClientFactory(log: ILogger, apikey: string, metadata: IMetadata, getFetch?: () => (IFetch | undefined), getOptions?: () => object): ISplitHttpClient {

  const options = getOptions && getOptions();
  const fetch = getFetch && getFetch();

  // if fetch is not available, log Error
  if (!fetch) log.e(`${messageNoFetch} The SDK will not get ready.`);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apikey}`,
    'SplitSDKVersion': metadata.version
  };

  if (metadata.ip) headers['SplitSDKMachineIP'] = metadata.ip;
  if (metadata.hostname) headers['SplitSDKMachineName'] = metadata.hostname;

  return function httpClient(url: string, method: string = 'GET', body?: string, extraHeaders?: Record<string, string>): Promise<Response> {
    const rHeaders = extraHeaders ? objectAssign({}, headers, extraHeaders) : headers;
    const request = objectAssign({ headers: rHeaders, method, body }, options);

    // using `fetch(url, options)` signature to work with unfetch, a lightweight ponyfill of fetch API.
    return fetch ? fetch(url, request)
      // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Checking_that_the_fetch_was_successful
      .then(response => {
        if (!response.ok) {
          throw { response };
        }
        return response;
      })
      .catch(error => {
        const resp = error.response;
        let msg = '';

        if (resp) { // An HTTP error
          switch (resp.status) {
            case 404: msg = 'Invalid API key or resource not found.';
              break;
            default: msg = resp.statusText;
              break;
          }
        } else { // Something else, either an error making the request or a Network error.
          msg = error.message;
        }

        if (!resp || resp.status !== 403) { // 403's log we'll be handled somewhere else.
          log.e(`Response status is not OK. Status: ${resp ? resp.status : 'NO_STATUS'}. URL: ${url}. Message: ${msg}`);
        }

        // passes `undefined` as statusCode if not an HTTP error (resp === undefined)
        throw new SplitNetworkError(msg, resp && resp.status);
      }) : Promise.reject(new SplitError(messageNoFetch));
  };
}
