import { objectAssign } from '../utils/lang/objectAssign';
import { IStatusInterface, SplitIO } from '../types';
import { releaseApiKey } from '../utils/inputValidation/apiKey';
import { clientFactory } from './client';
import { clientInputValidationDecorator } from './clientInputValidation';
import { ISdkFactoryContext } from '../sdkFactory/types';

/**
 * Creates an Sdk client, i.e., a base client with status and destroy interface
 */
export function sdkClientFactory(params: ISdkFactoryContext, isSharedClient?: boolean): SplitIO.IClient | SplitIO.IAsyncClient {
  const { sdkReadinessManager, syncManager, storage, signalListener, settings } = params;

  return objectAssign(
    // Proto-linkage of the readiness Event Emitter
    Object.create(sdkReadinessManager.sdkStatus) as IStatusInterface,

    // Client API (getTreatment* & track methods)
    clientInputValidationDecorator(
      settings,
      clientFactory(params),
      sdkReadinessManager.readinessManager
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

          // Release the API Key if it is the main client
          if (!isSharedClient) releaseApiKey(settings.core.authorizationKey);

          // Cleanup storage
          return storage.destroy();
        });
      }
    }
  );
}
