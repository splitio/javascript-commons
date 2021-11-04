import { ISdkFactoryParams } from './types';
import sdkReadinessManagerFactory from '../readiness/sdkReadinessManager';
import impressionsTrackerFactory from '../trackers/impressionsTracker';
import eventTrackerFactory from '../trackers/eventTracker';
import { IStorageFactoryParams, IStorageSync } from '../storages/types';
import { SplitIO } from '../types';
import { ISplitApi } from '../services/types';
import { getMatching } from '../utils/key';
import { shouldBeOptimized } from '../trackers/impressionObserver/utils';
import { validateAndTrackApiKey } from '../utils/inputValidation/apiKey';
import { createLoggerAPI } from '../logger/sdkLogger';
import { NEW_FACTORY, RETRIEVE_MANAGER } from '../logger/constants';
import { metadataBuilder } from '../storages/metadataBuilder';
import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED } from '../readiness/constants';

/**
 * Modular SDK factory
 */
export function sdkFactory(params: ISdkFactoryParams): SplitIO.ICsSDK | SplitIO.ISDK | SplitIO.IAsyncSDK {

  const { settings, platform, storageFactory, splitApiFactory,
    syncManagerFactory, SignalListener, impressionsObserverFactory, impressionListener,
    integrationsManagerFactory, sdkManagerFactory, sdkClientMethodFactory } = params;
  const log = settings.log;

  // @TODO handle non-recoverable errors: not start sync, mark the SDK as destroyed, etc.
  // We will just log and allow for the SDK to end up throwing an SDK_TIMEOUT event for devs to handle.
  validateAndTrackApiKey(log, settings.core.authorizationKey);

  // @TODO handle non-recoverable error, such as, `fetch` api not available, invalid API Key, etc.
  const sdkReadinessManager = sdkReadinessManagerFactory(log, platform.EventEmitter, settings.startup.readyTimeout);
  const readinessManager = sdkReadinessManager.readinessManager;

  const matchingKey = getMatching(settings.core.key);

  const storageFactoryParams: IStorageFactoryParams = {
    settings,
    optimize: shouldBeOptimized(settings),
    matchingKey,
    metadata: metadataBuilder(settings),

    // Callback used in consumer mode (`syncManagerFactory` is undefined) to emit SDK_READY
    onReadyCb: !syncManagerFactory ? (error) => {
      if (error) return; // don't emit SDK_READY if storage failed to connect.
      readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
      readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
    } : undefined,
  };

  const storage = storageFactory(storageFactoryParams);
  // @TODO add support for dataloader: `if (params.dataLoader) params.dataLoader(storage);`

  // splitApi is used by SyncManager and Browser signal listener
  const splitApi = splitApiFactory && splitApiFactory(settings, platform);

  const syncManager = syncManagerFactory && syncManagerFactory({
    settings,
    splitApi: splitApi as ISplitApi,
    storage: storage as IStorageSync,
    readiness: sdkReadinessManager.readinessManager,
    platform
  });

  const integrationsManager = integrationsManagerFactory && integrationsManagerFactory({ settings, storage });

  // trackers
  const observer = impressionsObserverFactory && impressionsObserverFactory();
  const impressionsTracker = impressionsTrackerFactory(log, storage.impressions, settings, impressionListener, integrationsManager, observer, storage.impressionCounts);
  const eventTracker = eventTrackerFactory(log, storage.events, integrationsManager);

  // signal listener
  const signalListener = SignalListener && new SignalListener(syncManager, settings, storage, splitApi);

  // Sdk client and manager
  const clientMethod = sdkClientMethodFactory({ eventTracker, impressionsTracker, sdkReadinessManager, settings, storage, syncManager, signalListener });
  const managerInstance = sdkManagerFactory(log, storage.splits, sdkReadinessManager);

  syncManager && syncManager.start();
  signalListener && signalListener.start();

  log.info(NEW_FACTORY);

  return {
    // Split evaluation and event tracking engine
    client: clientMethod,

    // Manager API to explore available information
    // @ts-ignore
    manager() {
      log.debug(RETRIEVE_MANAGER);
      return managerInstance;
    },

    // Logger wrapper API
    Logger: createLoggerAPI(settings.log),

    settings,
  };
}
