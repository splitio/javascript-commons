import { ISdkFactoryContext, ISdkFactoryContextSync, ISdkFactoryParams } from './types';
import { sdkReadinessManagerFactory } from '../readiness/sdkReadinessManager';
import { impressionsTrackerFactory } from '../trackers/impressionsTracker';
import { eventTrackerFactory } from '../trackers/eventTracker';
import { telemetryTrackerFactory } from '../trackers/telemetryTracker';
import { SplitIO } from '../types';
import { validateAndTrackApiKey } from '../utils/inputValidation/apiKey';
import { createLoggerAPI } from '../logger/sdkLogger';
import { NEW_FACTORY, RETRIEVE_MANAGER } from '../logger/constants';
import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED } from '../readiness/constants';
import { objectAssign } from '../utils/lang/objectAssign';
import { strategyDebugFactory } from '../trackers/strategy/strategyDebug';
import { strategyOptimizedFactory } from '../trackers/strategy/strategyOptimized';
import { strategyNoneFactory } from '../trackers/strategy/strategyNone';
import { uniqueKeysTrackerFactory } from '../trackers/uniqueKeysTracker';
import { NONE, OPTIMIZED } from '../utils/constants';

/**
 * Modular SDK factory
 */
export function sdkFactory(params: ISdkFactoryParams): SplitIO.ICsSDK | SplitIO.ISDK | SplitIO.IAsyncSDK {

  const { settings, platform, storageFactory, splitApiFactory, extraProps,
    syncManagerFactory, SignalListener, impressionsObserverFactory,
    integrationsManagerFactory, sdkManagerFactory, sdkClientMethodFactory,
    filterAdapterFactory } = params;
  const { log, sync: { impressionsMode } } = settings;

  // @TODO handle non-recoverable errors, such as, global `fetch` not available, invalid SDK Key, etc.
  // On non-recoverable errors, we should mark the SDK as destroyed and not start synchronization.

  // We will just log and allow for the SDK to end up throwing an SDK_TIMEOUT event for devs to handle.
  validateAndTrackApiKey(log, settings.core.authorizationKey);

  const sdkReadinessManager = sdkReadinessManagerFactory(log, platform.EventEmitter, settings.startup.readyTimeout);
  const readiness = sdkReadinessManager.readinessManager;

  const storage = storageFactory({
    settings,
    onReadyCb: (error) => {
      if (error) {
        // If storage fails to connect, SDK_READY_TIMED_OUT event is emitted immediately. Review when timeout and non-recoverable errors are reworked
        readiness.timeout();
        return;
      }
      readiness.splits.emit(SDK_SPLITS_ARRIVED);
      readiness.segments.emit(SDK_SEGMENTS_ARRIVED);
    },
  });
  // @TODO add support for dataloader: `if (params.dataLoader) params.dataLoader(storage);`

  const telemetryTracker = telemetryTrackerFactory(storage.telemetry, platform.now);
  const integrationsManager = integrationsManagerFactory && integrationsManagerFactory({ settings, storage, telemetryTracker });

  const observer = impressionsObserverFactory();
  const uniqueKeysTracker = impressionsMode === NONE ? uniqueKeysTrackerFactory(log, storage.uniqueKeys!, filterAdapterFactory && filterAdapterFactory()) : undefined;

  let strategy;
  switch (impressionsMode) {
    case OPTIMIZED:
      strategy = strategyOptimizedFactory(observer, storage.impressionCounts!);
      break;
    case NONE:
      strategy = strategyNoneFactory(storage.impressionCounts!, uniqueKeysTracker!);
      break;
    default:
      strategy = strategyDebugFactory(observer);
  }

  const impressionsTracker = impressionsTrackerFactory(settings, storage.impressions, strategy, integrationsManager, storage.telemetry);
  const eventTracker = eventTrackerFactory(settings, storage.events, integrationsManager, storage.telemetry);

  // splitApi is used by SyncManager and Browser signal listener
  const splitApi = splitApiFactory && splitApiFactory(settings, platform, telemetryTracker);

  const ctx: ISdkFactoryContext = { splitApi, eventTracker, impressionsTracker, telemetryTracker, uniqueKeysTracker, sdkReadinessManager, readiness, settings, storage, platform };

  const syncManager = syncManagerFactory && syncManagerFactory(ctx as ISdkFactoryContextSync);
  ctx.syncManager = syncManager;

  const signalListener = SignalListener && new SignalListener(syncManager, settings, storage, splitApi);
  ctx.signalListener = signalListener;

  // SDK client and manager
  const clientMethod = sdkClientMethodFactory(ctx);
  const managerInstance = sdkManagerFactory(log, storage.splits, sdkReadinessManager);

  syncManager && syncManager.start();
  signalListener && signalListener.start();

  log.info(NEW_FACTORY);

  // @ts-ignore
  return objectAssign({
    // Split evaluation and event tracking engine
    client: clientMethod,

    // Manager API to explore available information
    manager() {
      log.debug(RETRIEVE_MANAGER);
      return managerInstance;
    },

    // Logger wrapper API
    Logger: createLoggerAPI(log),

    settings,
  }, extraProps && extraProps(ctx));
}
