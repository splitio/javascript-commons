import { ISdkFactoryContext, ISdkFactoryContextSync, ISdkFactoryParams } from './types';
import { sdkReadinessManagerFactory } from '../readiness/sdkReadinessManager';
import { impressionsTrackerFactory } from '../trackers/impressionsTracker';
import { eventTrackerFactory } from '../trackers/eventTracker';
import { telemetryTrackerFactory } from '../trackers/telemetryTracker';
import SplitIO from '../../types/splitio';
import { validateAndTrackApiKey } from '../utils/inputValidation/apiKey';
import { createLoggerAPI } from '../logger/sdkLogger';
import { NEW_FACTORY, RETRIEVE_MANAGER } from '../logger/constants';
import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED, SDK_SPLITS_CACHE_LOADED } from '../readiness/constants';
import { objectAssign } from '../utils/lang/objectAssign';
import { strategyDebugFactory } from '../trackers/strategy/strategyDebug';
import { strategyOptimizedFactory } from '../trackers/strategy/strategyOptimized';
import { strategyNoneFactory } from '../trackers/strategy/strategyNone';
import { uniqueKeysTrackerFactory } from '../trackers/uniqueKeysTracker';
import { DEBUG, OPTIMIZED } from '../utils/constants';
import { setRolloutPlan } from '../storages/setRolloutPlan';
import { IStorageSync } from '../storages/types';
import { getMatching } from '../utils/key';
import { FallbackTreatmentsCalculator } from '../evaluator/fallbackTreatmentsCalculator';

/**
 * Modular SDK factory
 */
export function sdkFactory(params: ISdkFactoryParams): SplitIO.ISDK | SplitIO.IAsyncSDK | SplitIO.IBrowserSDK | SplitIO.IBrowserAsyncSDK {

  const { settings, platform, storageFactory, splitApiFactory, extraProps,
    syncManagerFactory, SignalListener, impressionsObserverFactory,
    integrationsManagerFactory, sdkManagerFactory, sdkClientMethodFactory,
    filterAdapterFactory, lazyInit } = params;
  const { log, sync: { impressionsMode }, initialRolloutPlan, core: { key } } = settings;

  // @TODO handle non-recoverable errors, such as, global `fetch` not available, invalid SDK Key, etc.
  // On non-recoverable errors, we should mark the SDK as destroyed and not start synchronization.

  // initialization
  let hasInit = false;
  const initCallbacks: (() => void)[] = [];

  function whenInit(cb: () => void) {
    if (hasInit) cb();
    else initCallbacks.push(cb);
  }

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

  const fallbackTreatmentsCalculator = new FallbackTreatmentsCalculator(settings.fallbackTreatments);

  if (initialRolloutPlan) {
    setRolloutPlan(log, initialRolloutPlan, storage as IStorageSync, key && getMatching(key));
    if ((storage as IStorageSync).splits.getChangeNumber() > -1) readiness.splits.emit(SDK_SPLITS_CACHE_LOADED);
  }

  const clients: Record<string, SplitIO.IBasicClient> = {};
  const telemetryTracker = telemetryTrackerFactory(storage.telemetry, platform.now);
  const integrationsManager = integrationsManagerFactory && integrationsManagerFactory({ settings, storage, telemetryTracker });

  const observer = impressionsObserverFactory();
  const uniqueKeysTracker = uniqueKeysTrackerFactory(log, storage.uniqueKeys, filterAdapterFactory && filterAdapterFactory());

  const noneStrategy = strategyNoneFactory(storage.impressionCounts, uniqueKeysTracker);
  const strategy = impressionsMode === OPTIMIZED ?
    strategyOptimizedFactory(observer, storage.impressionCounts) :
    impressionsMode === DEBUG ?
      strategyDebugFactory(observer) :
      noneStrategy;

  const impressionsTracker = impressionsTrackerFactory(settings, storage.impressions, noneStrategy, strategy, whenInit, integrationsManager, storage.telemetry);
  const eventTracker = eventTrackerFactory(settings, storage.events, whenInit, integrationsManager, storage.telemetry);

  // splitApi is used by SyncManager and Browser signal listener
  const splitApi = splitApiFactory && splitApiFactory(settings, platform, telemetryTracker);

  const ctx: ISdkFactoryContext = { clients, splitApi, eventTracker, impressionsTracker, telemetryTracker, uniqueKeysTracker, sdkReadinessManager, readiness, settings, storage, platform, fallbackTreatmentsCalculator };

  const syncManager = syncManagerFactory && syncManagerFactory(ctx as ISdkFactoryContextSync);
  ctx.syncManager = syncManager;

  const signalListener = SignalListener && new SignalListener(syncManager, settings, storage, splitApi);
  ctx.signalListener = signalListener;

  // SDK client and manager
  const clientMethod = sdkClientMethodFactory(ctx);
  const managerInstance = sdkManagerFactory(settings, storage.splits, sdkReadinessManager);


  function init() {
    if (hasInit) return;
    hasInit = true;

    // We will just log and allow for the SDK to end up throwing an SDK_TIMEOUT event for devs to handle.
    validateAndTrackApiKey(log, settings.core.authorizationKey);
    readiness.init();
    uniqueKeysTracker.start();
    syncManager && syncManager.start();
    signalListener && signalListener.start();

    initCallbacks.forEach((cb) => cb());
    initCallbacks.length = 0;
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
      hasInit = false;
      return Promise.all(Object.keys(clients).map(key => clients[key].destroy())).then(() => { });
    }
  }, extraProps && extraProps(ctx), lazyInit ? { init } : init());
}
