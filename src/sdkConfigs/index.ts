import { ISdkFactoryContext, ISdkFactoryContextSync, ISdkFactoryParams } from '../sdkFactory/types';
import { sdkReadinessManagerFactory } from '../readiness/sdkReadinessManager';
import { impressionsTrackerFactory } from '../trackers/impressionsTracker';
import { eventTrackerFactory } from '../trackers/eventTracker';
import { telemetryTrackerFactory } from '../trackers/telemetryTracker';
import SplitIO from '../../types/splitio';
import { createLoggerAPI } from '../logger/sdkLogger';
import { NEW_FACTORY } from '../logger/constants';
import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED, SDK_SPLITS_CACHE_LOADED } from '../readiness/constants';
import { objectAssign } from '../utils/lang/objectAssign';
import { FallbackTreatmentsCalculator } from '../evaluator/fallbackTreatmentsCalculator';
import { sdkLifecycleFactory } from '../sdkClient/sdkLifecycle';

/**
 * Modular SDK factory
 */
export function sdkConfigsFactory(params: ISdkFactoryParams): SplitIO.ConfigsClient {

  const { settings, platform, storageFactory, splitApiFactory, extraProps,
    syncManagerFactory, SignalListener, integrationsManagerFactory } = params;
  const { log } = settings;

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

  const fallbackTreatmentsCalculator = FallbackTreatmentsCalculator(settings.fallbackTreatments);

  const telemetryTracker = telemetryTrackerFactory(storage.telemetry, platform.now);
  const integrationsManager = integrationsManagerFactory && integrationsManagerFactory({ settings, storage, telemetryTracker });

  const impressionsTracker = impressionsTrackerFactory(params, storage, integrationsManager);
  const eventTracker = eventTrackerFactory(settings, storage.events, integrationsManager, storage.telemetry);

  // splitApi is used by SyncManager and Browser signal listener
  const splitApi = splitApiFactory && splitApiFactory(settings, platform, telemetryTracker);

  const ctx: ISdkFactoryContext = { clients: {}, splitApi, eventTracker, impressionsTracker, telemetryTracker, sdkReadinessManager, readiness, settings, storage, platform, fallbackTreatmentsCalculator };

  const syncManager = syncManagerFactory && syncManagerFactory(ctx as ISdkFactoryContextSync);
  ctx.syncManager = syncManager;

  const signalListener = SignalListener && new SignalListener(syncManager, settings, storage, splitApi);
  ctx.signalListener = signalListener;

  log.info(NEW_FACTORY, [settings.version]);

  return objectAssign(
    Object.create(sdkReadinessManager.sdkStatus) as SplitIO.IStatusInterface,
    sdkLifecycleFactory(ctx),
    {
      getConfig(name: string, target?: SplitIO.Target): SplitIO.Config {
        return {
          value: name + target,
        } as SplitIO.Config;
      },

      track() {
        return false;
      },

      // Logger wrapper API
      Logger: createLoggerAPI(log),

      settings,
    },
    extraProps && extraProps(ctx)
  );
}
