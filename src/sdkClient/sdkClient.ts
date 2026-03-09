import { objectAssign } from '../utils/lang/objectAssign';
import SplitIO from '../../types/splitio';
import { clientFactory } from './client';
import { clientInputValidationDecorator } from './clientInputValidation';
import { ISdkFactoryContext } from '../sdkFactory/types';
import { sdkLifecycleFactory } from './sdkLifecycle';

/**
 * Creates an Sdk client, i.e., a base client with status, init, flush and destroy interface
 */
export function sdkClientFactory(params: ISdkFactoryContext, isSharedClient?: boolean): SplitIO.IClient | SplitIO.IAsyncClient {
  const { sdkReadinessManager, settings } = params;


  return objectAssign(
    // Proto-linkage of the readiness Event Emitter
    Object.create(sdkReadinessManager.sdkStatus) as SplitIO.IStatusInterface,

    // Client API (getTreatment* & track methods)
    clientInputValidationDecorator(
      settings,
      clientFactory(params),
      sdkReadinessManager.readinessManager,
      params.fallbackTreatmentsCalculator
    ),

    sdkLifecycleFactory(params, isSharedClient)
  );
}
