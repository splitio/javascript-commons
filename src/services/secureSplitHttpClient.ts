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

  function makeRequest(url: string, options: IRequestOptions | undefined, latencyTracker?: (error?: NetworkError) => void, logErrorsAsInfo?: boolean, newVersionHeader?: boolean, token?: string): Promise<IResponse> {
    return splitHttpClient(url, token ? { ...options, headers: { ...options?.headers, Authorization: `Bearer ${token}` } } : options, latencyTracker, logErrorsAsInfo, newVersionHeader);
  }

  const httpClient = function (url: string, options?: IRequestOptions, latencyTracker?: (error?: NetworkError) => void, logErrorsAsInfo?: boolean, newVersionHeader = true, useJwt = true): Promise<IResponse> {
    return authProvider.credential().then(credential => {
      return makeRequest(url, options, latencyTracker, logErrorsAsInfo, newVersionHeader, useJwt ? credential.token : undefined)
        .catch((error: NetworkError) => {
          if (error.statusCode === 401) {
            // retry once for 401, in case the token has just expired
            authProvider.invalidate();
            return authProvider.credential().then(newCredential => {
              return makeRequest(url, options, latencyTracker, logErrorsAsInfo, newVersionHeader, useJwt ? newCredential.token : undefined);
            });
          }
          throw error;
        });
    });
  };

  httpClient.stop = () => authProvider.stop();

  return httpClient;
}
