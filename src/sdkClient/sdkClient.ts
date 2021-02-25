import objectAssign from 'object-assign';
import { IStatusInterface, SplitIO } from '../types';
import { CONSUMER_MODE } from '../utils/constants';
import { releaseApiKey } from '../utils/inputValidation/apiKey';
import clientFactory from './client';
import clientInputValidationDecorator from './clientInputValidation';
import { ISdkClientFactoryParams } from './types';

/**
 * Creates an Sdk client, i.e., a base client with status and destroy interface
 */
export function sdkClientFactory(params: ISdkClientFactoryParams): SplitIO.IClient | SplitIO.IAsyncClient {
  const { sdkReadinessManager, syncManager, storage, signalListener, settings, sharedClient } = params;

  return objectAssign(
    // Proto-linkage of the readiness Event Emitter
    Object.create(sdkReadinessManager.sdkStatus) as IStatusInterface,

    // Client API (getTreatment* & track methods)
    clientInputValidationDecorator(
      clientFactory(params),
      sdkReadinessManager.readinessManager,
      // @TODO isStorageSync could be extracted from the storage itself (e.g. `storage.isSync`) to simplify interfaces
      settings.mode === CONSUMER_MODE ? false : true,
      settings.log
    ),

    // Sdk destroy
    {
      destroy() {
        // Stop background jobs
        syncManager && syncManager.stop();
        const flush = syncManager ? syncManager.flush() : Promise.resolve();

        return flush.then(() => {
          // Cleanup event listeners
          sdkReadinessManager.readinessManager.destroy();
          signalListener && signalListener.stop();

          // Cleanup storage
          storage.destroy();

          // Release the API Key if it is the main client
          if (!sharedClient) releaseApiKey(settings.core.authorizationKey);
        });
      }
    }
  );
}
