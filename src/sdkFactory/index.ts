import { ISdkFactoryContext, ISdkFactoryContextSync, ISdkFactoryParams } from './types';
import { sdkReadinessManagerFactory } from '../readiness/sdkReadinessManager';
import { impressionsTrackerFactory } from '../trackers/impressionsTracker';
import { eventTrackerFactory } from '../trackers/eventTracker';
import { telemetryTrackerFactory } from '../trackers/telemetryTracker';
import SplitIO from '../../types/splitio';
import { createLoggerAPI } from '../logger/sdkLogger';
import { NEW_FACTORY, RETRIEVE_MANAGER } from '../logger/constants';
import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED, SDK_SPLITS_CACHE_LOADED } from '../readiness/constants';
import { objectAssign } from '../utils/lang/objectAssign';
import { setRolloutPlan } from '../storages/setRolloutPlan';
import { IStorageSync } from '../storages/types';
import { getMatching } from '../utils/key';
import { FallbackTreatmentsCalculator } from '../evaluator/fallbackTreatmentsCalculator';

/**
 * Modular SDK factory
 */
export function sdkFactory(params: ISdkFactoryParams): SplitIO.ISDK | SplitIO.IAsyncSDK | SplitIO.IBrowserSDK | SplitIO.IBrowserAsyncSDK {

  const { settings, platform, storageFactory, splitApiFactory, extraProps,
    syncManagerFactory, SignalListener,
    integrationsManagerFactory, sdkManagerFactory, sdkClientMethodFactory, lazyInit } = params;
  const { log, initialRolloutPlan, core: { key } } = settings;

  // @TODO handle non-recoverable errors, such as, global `fetch` not available, invalid SDK Key, etc.
  // On non-recoverable errors, we should mark the SDK as destroyed and not start synchronization.

  const sdkReadinessManager = sdkReadinessManagerFactory(platform.EventEmitter, settings);
  const readiness = sdkReadinessManager.readinessManager;

  const storage = storageFactory({
    settings,
    onReadyCb(error) {
      if (error) {
        // If storage fails to connect, SDK_READY_TIMED_OUT event is emitted immediately. Review when timeout and non-recoverable errors are reworked
        readiness.timeout();
        return;
      }
      readiness.splits.emit(SDK_SPLITS_ARRIVED);
      readiness.segments.emit(SDK_SEGMENTS_ARRIVED);
    },
    onReadyFromCacheCb() {
      readiness.splits.emit(SDK_SPLITS_CACHE_LOADED);
    }
  });

  const fallbackCalculator = FallbackTreatmentsCalculator(settings.fallbackTreatments);

  if (initialRolloutPlan) {
    setRolloutPlan(log, initialRolloutPlan, storage as IStorageSync, key && getMatching(key));
    if ((storage as IStorageSync).splits.getChangeNumber() > -1) readiness.splits.emit(SDK_SPLITS_CACHE_LOADED, { initialCacheLoad: false /* Not an initial load, cache exists */ });
  }

  const clients: Record<string, SplitIO.IBasicClient & { init: () => void }> = {};
  const telemetryTracker = telemetryTrackerFactory(storage.telemetry, platform.now);
  const integrationsManager = integrationsManagerFactory && integrationsManagerFactory({ settings, storage, telemetryTracker });

  const impressionsTracker = impressionsTrackerFactory(params, storage, integrationsManager);
  const eventTracker = eventTrackerFactory(settings, storage.events, integrationsManager, storage.telemetry);

  // splitApi is used by SyncManager and Browser signal listener
  const splitApi = splitApiFactory && splitApiFactory(settings, platform, telemetryTracker);

  const ctx: ISdkFactoryContext = { clients, splitApi, eventTracker, impressionsTracker, telemetryTracker, sdkReadinessManager, readiness, settings, storage, platform, fallbackCalculator };

  const syncManager = syncManagerFactory && syncManagerFactory(ctx as ISdkFactoryContextSync);
  ctx.syncManager = syncManager;

  // @TODO: move into platform, and call inside sdkClientFactory (if it's used only there)
  const signalListener = SignalListener && new SignalListener(syncManager, settings, storage, splitApi);
  ctx.signalListener = signalListener;

  // SDK client and manager
  const clientMethod = sdkClientMethodFactory(ctx);
  const managerInstance = sdkManagerFactory(settings, storage.splits, sdkReadinessManager);


  function init() {
    Object.keys(clients).map(key => clients[key].init());
  }

  log.info(NEW_FACTORY, [settings.version]);

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

    destroy() {
      return Promise.all(Object.keys(clients).map(key => clients[key].destroy())).then(() => { });
    }
  }, extraProps && extraProps(ctx), lazyInit ? { init } : init());
}
