import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { ITelemetryCacheSync, IStorageBase } from '../storages/types';
import { IImpressionsHandler, IImpressionsTracker, ImpressionDecorated } from './types';
import { IMPRESSIONS_TRACKER_SUCCESS, ERROR_IMPRESSIONS_TRACKER, ERROR_IMPRESSIONS_LISTENER } from '../logger/constants';
import { CONSENT_DECLINED, DEBUG, DEDUPED, OPTIMIZED, QUEUED } from '../utils/constants';
import SplitIO from '../../types/splitio';
import { ISdkFactoryParams } from '../sdkFactory/types';
import { strategyDebugFactory } from './strategy/strategyDebug';
import { strategyNoneFactory } from './strategy/strategyNone';
import { strategyOptimizedFactory } from './strategy/strategyOptimized';
import { uniqueKeysTrackerFactory } from './uniqueKeysTracker';

/**
 * Impressions tracker stores impressions in cache and pass them to the listener and integrations manager if provided.
 */
export function impressionsTrackerFactory(
  params: Pick<ISdkFactoryParams, 'settings' | 'impressionsObserverFactory' | 'filterAdapterFactory'>,
  storage: Pick<IStorageBase, 'impressions' | 'impressionCounts' | 'uniqueKeys' | 'telemetry'>,
  integrationsManager?: IImpressionsHandler,
): IImpressionsTracker {

  const { settings, impressionsObserverFactory, filterAdapterFactory } = params;
  const { log, impressionListener, runtime: { ip, hostname }, version, sync: { impressionsMode } } = settings;
  const observer = impressionsObserverFactory();
  const uniqueKeysTracker = uniqueKeysTrackerFactory(log, storage.uniqueKeys, filterAdapterFactory && filterAdapterFactory());

  const noneStrategy = strategyNoneFactory(storage.impressionCounts, uniqueKeysTracker);
  const strategy = impressionsMode === OPTIMIZED ?
    strategyOptimizedFactory(observer, storage.impressionCounts) :
    impressionsMode === DEBUG ?
      strategyDebugFactory(observer) :
      noneStrategy;

  return {
    start() {
      uniqueKeysTracker.start();
    },

    stop() {
      uniqueKeysTracker.stop();
    },

    track(impressions: ImpressionDecorated[], attributes?: SplitIO.Attributes) {
      if (settings.userConsent === CONSENT_DECLINED) return;

      const impressionsToStore = impressions.filter(({ imp, disabled }) => {
        return disabled ?
          noneStrategy.process(imp) :
          strategy.process(imp);
      });

      const impressionsLength = impressions.length;
      const impressionsToStoreLength = impressionsToStore.length;

      if (impressionsToStoreLength) {
        const res = storage.impressions.track(impressionsToStore.map((item) => item.imp));

        // If we're on an async storage, handle error and log it.
        if (thenable(res)) {
          res.then(() => {
            log.info(IMPRESSIONS_TRACKER_SUCCESS, [impressionsLength]);
          }).catch(err => {
            log.error(ERROR_IMPRESSIONS_TRACKER, [impressionsLength, err]);
          });
        } else {
          // Record when impressionsCache is sync only (standalone mode)
          // @TODO we are not dropping impressions on full queue yet, so DROPPED stats are not recorded
          if (storage.telemetry) {
            (storage.telemetry as ITelemetryCacheSync).recordImpressionStats(QUEUED, impressionsToStoreLength);
            (storage.telemetry as ITelemetryCacheSync).recordImpressionStats(DEDUPED, impressionsLength - impressionsToStoreLength);
          }
        }
      }

      // @TODO next block might be handled by the integration manager. In that case, the metadata object doesn't need to be passed in the constructor
      if (impressionListener || integrationsManager) {
        for (let i = 0; i < impressionsLength; i++) {
          const impressionData: SplitIO.ImpressionData = {
            // copy of impression, to avoid unexpected behavior if modified by integrations or impressionListener
            impression: objectAssign({}, impressions[i].imp),
            attributes,
            ip,
            hostname,
            sdkLanguageVersion: version
          };

          // Wrap in a timeout because we don't want it to be blocking.
          setTimeout(() => {
            // integrationsManager.handleImpression does not throw errors
            if (integrationsManager) integrationsManager.handleImpression(impressionData);

            try { // @ts-ignore. An exception on the listeners should not break the SDK.
              if (impressionListener) impressionListener.logImpression(impressionData);
            } catch (err) {
              log.error(ERROR_IMPRESSIONS_LISTENER, [err]);
            }
          });
        }
      }
    }
  };
}
