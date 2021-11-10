import clientCSDecorator from './clientCS';
import { ISdkClientFactoryParams } from './types';
import { SplitIO } from '../types';
import { validateKey } from '../utils/inputValidation/key';
import { getMatching, keyParser } from '../utils/key';
import { sdkClientFactory } from './sdkClient';
import { ISyncManagerCS } from '../sync/types';
import objectAssign from 'object-assign';
import { RETRIEVE_CLIENT_DEFAULT, NEW_SHARED_CLIENT, RETRIEVE_CLIENT_EXISTING } from '../logger/constants';
import { SDK_SEGMENTS_ARRIVED } from '../readiness/constants';

function buildInstanceId(key: SplitIO.SplitKey) {
  // @ts-ignore
  return `${key.matchingKey ? key.matchingKey : key}-${key.bucketingKey ? key.bucketingKey : key}-`;
}

const method = 'Client instantiation';

/**
 * Factory of client method for the client-side API variant where TT is ignored and thus
 * clients don't have a binded TT for the track method.
 */
export function sdkClientMethodCSFactory(params: ISdkClientFactoryParams): (key?: SplitIO.SplitKey) => SplitIO.ICsClient {
  const { storage, syncManager, sdkReadinessManager, settings: { core: { key }, startup: { readyTimeout }, log } } = params;

  // Keeping similar behaviour as in the isomorphic JS SDK: if settings key is invalid,
  // `false` value is used as binded key of the default client, but trafficType is ignored
  // @TODO handle as a non-recoverable error
  const validKey = validateKey(log, key, method);

  const mainClientInstance = clientCSDecorator(
    sdkClientFactory(params) as SplitIO.IClient, // @ts-ignore
    validKey
  );

  const parsedDefaultKey = keyParser(key);
  const defaultInstanceId = buildInstanceId(parsedDefaultKey);

  // Cache instances created per factory.
  const clientInstances: Record<string, SplitIO.ICsClient> = {};
  clientInstances[defaultInstanceId] = mainClientInstance;

  return function client(key?: SplitIO.SplitKey) {
    if (key === undefined) {
      log.debug(RETRIEVE_CLIENT_DEFAULT);
      return mainClientInstance;
    }

    // Validate the key value. The trafficType (2nd argument) is ignored
    const validKey = validateKey(log, key, method);
    if (validKey === false) {
      throw new Error('Shared Client needs a valid key.');
    }

    const instanceId = buildInstanceId(validKey);

    if (!clientInstances[instanceId]) {
      const matchingKey = getMatching(validKey);

      const sharedSdkReadiness = sdkReadinessManager.shared(readyTimeout);

      const sharedStorage = storage.shared && storage.shared(matchingKey, (err) => {
        // Emit SDK_READY in consumer mode for shared clients
        if (err) return; // don't emit SDK_READY if storage failed to connect.
        sharedSdkReadiness.readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
      });

      // 3 possibilities:
      // - Standalone mode: both syncManager and sharedSyncManager are defined
      // - Consumer mode: both syncManager and sharedSyncManager are undefined
      // - Consumer partial mode: syncManager is defined (only for submitters) but sharedSyncManager is undefined
      // @ts-ignore
      const sharedSyncManager = syncManager && sharedStorage && (syncManager as ISyncManagerCS).shared(matchingKey, sharedSdkReadiness.readinessManager, sharedStorage);

      // As shared clients reuse all the storage information, we don't need to check here if we
      // will use offline or online mode. We should stick with the original decision.
      clientInstances[instanceId] = clientCSDecorator(
        sdkClientFactory(objectAssign({}, params, {
          sdkReadinessManager: sharedSdkReadiness,
          storage: sharedStorage || storage,
          syncManager: sharedSyncManager,
          signalListener: undefined, // only the main client "destroy" method stops the signal listener
          sharedClient: true
        })) as SplitIO.IClient,
        validKey
      );

      sharedSyncManager && sharedSyncManager.start();

      log.info(NEW_SHARED_CLIENT);
    } else {
      log.debug(RETRIEVE_CLIENT_EXISTING);
    }

    return clientInstances[instanceId];
  };
}
