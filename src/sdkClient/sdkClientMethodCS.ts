import { clientCSDecorator } from './clientCS';
import { SplitIO } from '../types';
import { validateKey } from '../utils/inputValidation/key';
import { getMatching, keyParser } from '../utils/key';
import { sdkClientFactory } from './sdkClient';
import { ISyncManagerCS } from '../sync/types';
import { objectAssign } from '../utils/lang/objectAssign';
import { RETRIEVE_CLIENT_DEFAULT, NEW_SHARED_CLIENT, RETRIEVE_CLIENT_EXISTING, LOG_PREFIX_CLIENT_INSTANTIATION } from '../logger/constants';
import { SDK_SEGMENTS_ARRIVED } from '../readiness/constants';
import { ISdkFactoryContext } from '../sdkFactory/types';
import { buildInstanceId } from './identity';

/**
 * Factory of client method for the client-side API variant where TT is ignored.
 * Therefore, clients don't have a bound TT for the track method.
 */
export function sdkClientMethodCSFactory(params: ISdkFactoryContext): (key?: SplitIO.SplitKey) => SplitIO.ICsClient {
  const { clients, storage, syncManager, sdkReadinessManager, settings: { core: { key }, log } } = params;

  const mainClientInstance = clientCSDecorator(
    log,
    sdkClientFactory(params) as SplitIO.IClient,
    key
  );

  const parsedDefaultKey = keyParser(key);
  const defaultInstanceId = buildInstanceId(parsedDefaultKey);

  // Cache instances created per factory.
  clients[defaultInstanceId] = mainClientInstance;

  return function client(key?: SplitIO.SplitKey) {
    if (key === undefined) {
      log.debug(RETRIEVE_CLIENT_DEFAULT);
      return mainClientInstance;
    }

    // Validate the key value. The trafficType (2nd argument) is ignored
    const validKey = validateKey(log, key, LOG_PREFIX_CLIENT_INSTANTIATION);
    if (validKey === false) {
      throw new Error('Shared Client needs a valid key.');
    }

    const instanceId = buildInstanceId(validKey);

    if (!clients[instanceId]) {
      const matchingKey = getMatching(validKey);

      const sharedSdkReadiness = sdkReadinessManager.shared();
      const sharedStorage = storage.shared && storage.shared(matchingKey, (err) => {
        if (err) {
          sharedSdkReadiness.readinessManager.timeout();
          return;
        }
        // Emit SDK_READY in consumer mode for shared clients
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
      clients[instanceId] = clientCSDecorator(
        log,
        sdkClientFactory(objectAssign({}, params, {
          sdkReadinessManager: sharedSdkReadiness,
          storage: sharedStorage || storage,
          syncManager: sharedSyncManager,
        }), true) as SplitIO.IClient,
        validKey
      );

      log.info(NEW_SHARED_CLIENT);
    } else {
      log.debug(RETRIEVE_CLIENT_EXISTING);
    }

    return clients[instanceId] as SplitIO.ICsClient;
  };
}
