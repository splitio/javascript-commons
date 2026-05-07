import { IRequestOptions, IResponse, ISecureSplitHttpClient, IFetchAuth, NetworkError } from './types';
import { ISettings } from '../types';
import { IPlatform } from '../sdkFactory/types';
import { splitHttpClientFactory } from './splitHttpClient';
import { authProviderFactory } from './authProvider';

/**
 * Factory of Secure HTTP client, which authenticates requests using a JWT token.
 * On 401 responses, invalidates the cached credential and retries once with a fresh token.
 *
 * @param settings - SDK settings
 * @param platform - object containing environment-specific dependencies
 * @param fetchAuth - function to fetch auth credentials from the /v2/auth endpoint
 */
export function secureSplitHttpClientFactory(settings: ISettings, platform: Pick<IPlatform, 'getOptions' | 'getFetch'>, fetchAuth: IFetchAuth): ISecureSplitHttpClient {

  const splitHttpClient = splitHttpClientFactory(settings, platform);
  const authProvider = authProviderFactory(fetchAuth, settings.log);

  function makeRequest(url: string, options: IRequestOptions | undefined, latencyTracker: ((error?: NetworkError) => void) | undefined, logErrorsAsInfo: boolean | undefined, token: string): Promise<IResponse> {
    return splitHttpClient(url, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${token}` } }, latencyTracker, logErrorsAsInfo);
  }

  const httpClient = function (url: string, options?: IRequestOptions, latencyTracker?: (error?: NetworkError) => void, logErrorsAsInfo?: boolean): Promise<IResponse> {
    return authProvider.credential().then(credential => {
      return makeRequest(url, options, latencyTracker, logErrorsAsInfo, credential.token)
        .catch((error: NetworkError) => {
          if (error.statusCode === 401) {
            // retry once for 401, in case the token has just expired
            authProvider.invalidate();
            return authProvider.credential().then(newCredential => {
              return makeRequest(url, options, latencyTracker, logErrorsAsInfo, newCredential.token);
            });
          }
          throw error;
        });
    });
  };

  httpClient.stop = () => authProvider.stop();

  return httpClient;
}
