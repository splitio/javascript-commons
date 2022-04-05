import { SplitIO } from '../types';
import { sdkClientFactory } from './sdkClient';
import { RETRIEVE_CLIENT_DEFAULT } from '../logger/constants';
import { ISdkFactoryContext } from '../sdkFactory/types';

/**
 * Factory of client method for server-side SDKs (ISDK and IAsyncSDK)
 */
export function sdkClientMethodFactory(params: ISdkFactoryContext): () => SplitIO.IClient | SplitIO.IAsyncClient {
  const log = params.settings.log;
  const clientInstance = sdkClientFactory(params);

  return function client() {
    if (arguments.length > 0) {
      throw new Error('Shared Client not supported by the storage mechanism. Create isolated instances instead.');
    }

    log.debug(RETRIEVE_CLIENT_DEFAULT);
    return clientInstance;
  };
}
