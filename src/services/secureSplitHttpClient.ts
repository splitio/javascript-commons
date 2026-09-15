import { IRequestOptions, IResponse, ISecureSplitHttpClient, ISplitHttpClient, NetworkError } from './types';
import { IAuthProvider } from './authProvider';

/**
 * Factory of Secure HTTP client, which authenticates requests using a JWT token.
 * On 401 responses, invalidates the cached credential and retries once with a fresh token.
 *
 * @param splitHttpClient - `splitHttpClientFactory` to use for making requests
 * @param authProvider - `authProviderFactory` to use for authentication
 */
export function secureSplitHttpClientFactory(splitHttpClient: ISplitHttpClient, authProvider: IAuthProvider): ISecureSplitHttpClient {

  function makeRequest(url: string, options: IRequestOptions | undefined, latencyTracker: ((error?: NetworkError) => void) | undefined, logErrorsAsInfo: boolean | undefined, token: string): Promise<IResponse> {
    return splitHttpClient(url, { ...options, headers: { ...options?.headers, Authorization: `Bearer ${token}` } }, latencyTracker, logErrorsAsInfo, true);
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
