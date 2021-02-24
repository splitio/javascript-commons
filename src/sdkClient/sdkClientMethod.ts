import { ISdkClientFactoryParams } from './types';
import { SplitIO } from '../types';
import { logFactory } from '../logger/sdkLogger';
import { sdkClientFactory } from './sdkClient';
const log = logFactory('splitio');

/**
 * Factory of client method for server-side SDKs (ISDK and IAsyncSDK)
 */
export function sdkClientMethodFactory(params: ISdkClientFactoryParams): () => SplitIO.IClient | SplitIO.IAsyncClient {

  const clientInstance = sdkClientFactory(params);

  return function client() {
    if (arguments.length > 0) {
      throw new Error('Shared Client not supported by the storage mechanism. Create isolated instances instead.');
    }

    log.d('Retrieving SDK client.');
    return clientInstance;
  };
}
