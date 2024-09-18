import { clientCSDecorator } from './clientCS';
import { SplitIO } from '../types';
import { validateKey } from '../utils/inputValidation/key';
import { validateTrafficType } from '../utils/inputValidation/trafficType';
import { getMatching, keyParser } from '../utils/key';
import { sdkClientFactory } from './sdkClient';
import { ISyncManagerCS } from '../sync/types';
import { objectAssign } from '../utils/lang/objectAssign';
import { RETRIEVE_CLIENT_DEFAULT, NEW_SHARED_CLIENT, RETRIEVE_CLIENT_EXISTING, LOG_PREFIX_CLIENT_INSTANTIATION } from '../logger/constants';
import { SDK_SEGMENTS_ARRIVED } from '../readiness/constants';
import { ISdkFactoryContext } from '../sdkFactory/types';
import { buildInstanceId } from './identity';

/**
 * Factory of client method for the client-side (browser) variant of the Isomorphic JS SDK,
 * where clients can have a bound TT for the track method, which is provided via the settings
 * (default client) or the client method (shared clients).
 */
export function sdkClientMethodCSFactory(params: ISdkFactoryContext): (key?: SplitIO.SplitKey, trafficType?: string) => SplitIO.ICsClient {
  const { clients, storage, syncManager, sdkReadinessManager, settings: { core: { key, trafficType }, startup: { readyTimeout }, log } } = params;

  const mainClientInstance = clientCSDecorator(
    log,
    sdkClientFactory(params) as SplitIO.IClient,
    key,
    trafficType
  );

  const parsedDefaultKey = keyParser(key);
  const defaultInstanceId = buildInstanceId(parsedDefaultKey, trafficType);

  // Cache instances created per factory.
  clients[defaultInstanceId] = mainClientInstance;

  return function client(key?: SplitIO.SplitKey, trafficType?: string) {
    if (key === undefined) {
      log.debug(RETRIEVE_CLIENT_DEFAULT);
      return mainClientInstance;
    }

    // Validate the key value
    const validKey = validateKey(log, key, LOG_PREFIX_CLIENT_INSTANTIATION);
    if (validKey === false) {
      throw new Error('Shared Client needs a valid key.');
    }

    let validTrafficType;
    if (trafficType !== undefined) {
      validTrafficType = validateTrafficType(log, trafficType, LOG_PREFIX_CLIENT_INSTANTIATION);
      if (validTrafficType === false) {
        throw new Error('Shared Client needs a valid traffic type or no traffic type at all.');
      }
    }
    const instanceId = buildInstanceId(validKey, validTrafficType);

    if (!clients[instanceId]) {
      const matchingKey = getMatching(validKey);

      const sharedSdkReadiness = sdkReadinessManager.shared(readyTimeout);
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
        validKey,
        validTrafficType
      );

      sharedSyncManager && sharedSyncManager.start();

      log.info(NEW_SHARED_CLIENT);
    } else {
      log.debug(RETRIEVE_CLIENT_EXISTING);
    }

    return clients[instanceId] as SplitIO.ICsClient;
  };
}
