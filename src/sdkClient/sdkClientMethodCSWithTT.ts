import clientCSDecorator from './clientCS';
import { ISdkClientFactoryParams } from './types';
import { SplitIO } from '../types';
import { validateKey } from '../utils/inputValidation/key';
import { validateTrafficType } from '../utils/inputValidation/trafficType';
import { logFactory } from '../logger/sdkLogger';
import { getMatching, keyParser } from '../utils/key';
import { sdkClientFactory } from './sdkClient';
import { IStorageSyncCS } from '../storages/types';
import { ISyncManagerCS } from '../sync/types';
import objectAssign from 'object-assign';
const log = logFactory('splitio');

function buildInstanceId(key: SplitIO.SplitKey, trafficType?: string) {
  // @ts-ignore
  return `${key.matchingKey ? key.matchingKey : key}-${key.bucketingKey ? key.bucketingKey : key}-${trafficType !== undefined ? trafficType : ''}`;
}

/**
 * Factory of client method for the client-side (browser) variant of the Isomorphic JS SDK,
 * where clients can have a binded TT for the track method, which is provided via the settings
 * (default client) or the client method (shared clients).
 */
export function sdkClientMethodCSFactory(params: ISdkClientFactoryParams): (key?: SplitIO.SplitKey, trafficType?: string) => SplitIO.ICsClient {
  const { storage, syncManager, sdkReadinessManager, settings: { core: { key, trafficType }, startup: { readyTimeout } } } = params;

  // Keeping the behaviour as in the isomorphic JS SDK: if settings key or TT are invalid,
  // `false` value is used as binded key/TT of the default client, which leads to several issues.
  // @TODO update when supporting non-recoverable errors
  const validKey = validateKey(key, 'Client instantiation');
  let validTrafficType;
  if (trafficType !== undefined) {
    validTrafficType = validateTrafficType(trafficType, 'Client instantiation');
  }

  const mainClientInstance = clientCSDecorator(
    sdkClientFactory(params) as SplitIO.IClient, // @ts-ignore
    validKey,
    validTrafficType
  );

  const parsedDefaultKey = keyParser(key);
  const defaultInstanceId = buildInstanceId(parsedDefaultKey, trafficType);

  // Cache instances created per factory.
  const clientInstances: Record<string, SplitIO.ICsClient> = {};
  clientInstances[defaultInstanceId] = mainClientInstance;

  return function client(key?: SplitIO.SplitKey, trafficType?: string) {
    if (key === undefined) {
      log.debug('Retrieving default SDK client.');
      return mainClientInstance;
    }

    // Validate the key value
    const validKey = validateKey(key, 'Shared Client instantiation');
    if (validKey === false) {
      throw new Error('Shared Client needs a valid key.');
    }

    let validTrafficType;
    if (trafficType !== undefined) {
      validTrafficType = validateTrafficType(trafficType, 'Shared Client instantiation');
      if (validTrafficType === false) {
        throw new Error('Shared Client needs a valid traffic type or no traffic type at all.');
      }
    }
    const instanceId = buildInstanceId(validKey, validTrafficType);

    if (!clientInstances[instanceId]) {
      const matchingKey = getMatching(validKey);

      const sharedSdkReadiness = sdkReadinessManager.shared(readyTimeout);
      const sharedStorage = (storage as IStorageSyncCS).shared(matchingKey);
      const sharedSyncManager = (syncManager as ISyncManagerCS).shared(matchingKey, sharedSdkReadiness.readinessManager, sharedStorage);

      // As shared clients reuse all the storage information, we don't need to check here if we
      // will use offline or online mode. We should stick with the original decision.
      clientInstances[instanceId] = clientCSDecorator(
        sdkClientFactory(objectAssign({}, params, {
          sdkReadinessManager: sharedSdkReadiness,
          storage: sharedStorage,
          syncManager: sharedSyncManager,
          signalListener: undefined, // only the main client "destroy" method stops the signal listener
          sharedClient: true
        })) as SplitIO.IClient,
        validKey,
        validTrafficType
      );

      sharedSyncManager.start();

      log.info('New shared client instance created.');
    } else {
      log.debug('Retrieving existing SDK client.');
    }

    return clientInstances[instanceId];
  };
}
