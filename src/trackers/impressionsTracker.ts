import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { IImpressionsCacheBase, ITelemetryCacheSync, ITelemetryCacheAsync } from '../storages/types';
import { IImpressionsHandler, IImpressionsTracker, IStrategy } from './types';
import { SplitIO, ImpressionDTO, ISettings } from '../types';
import { IMPRESSIONS_TRACKER_SUCCESS, ERROR_IMPRESSIONS_TRACKER, ERROR_IMPRESSIONS_LISTENER } from '../logger/constants';
import { CONSENT_DECLINED, DEDUPED, QUEUED } from '../utils/constants';

/**
 * Impressions tracker stores impressions in cache and pass them to the listener and integrations manager if provided.
 *
 * @param impressionsCache cache to save impressions
 * @param metadata runtime metadata (ip, hostname and version)
 * @param impressionListener optional impression listener
 * @param integrationsManager optional integrations manager
 * @param strategy strategy for impressions tracking.
 */
export function impressionsTrackerFactory(
  settings: ISettings,
  impressionsCache: IImpressionsCacheBase,
  strategy: IStrategy,
  integrationsManager?: IImpressionsHandler,
  telemetryCache?: ITelemetryCacheSync | ITelemetryCacheAsync,
): IImpressionsTracker {

  const { log, impressionListener, runtime: { ip, hostname }, version } = settings;

  return {
    track(impressions: ImpressionDTO[], attributes?: SplitIO.Attributes) {
      if (settings.userConsent === CONSENT_DECLINED) return;

      const impressionsCount = impressions.length;
      const { impressionsToStore, impressionsToListener, deduped } = strategy.process(impressions);

      const impressionsToListenerCount = impressionsToListener.length;

      if (impressionsToStore.length > 0) {
        const res = impressionsCache.track(impressionsToStore);

        // If we're on an async storage, handle error and log it.
        if (thenable(res)) {
          res.then(() => {
            log.info(IMPRESSIONS_TRACKER_SUCCESS, [impressionsCount]);
          }).catch(err => {
            log.error(ERROR_IMPRESSIONS_TRACKER, [impressionsCount, err]);
          });
        } else {
          // Record when impressionsCache is sync only (standalone mode)
          // @TODO we are not dropping impressions on full queue yet, so DROPPED stats are not recorded
          if (telemetryCache) {
            (telemetryCache as ITelemetryCacheSync).recordImpressionStats(QUEUED, impressionsToStore.length);
            (telemetryCache as ITelemetryCacheSync).recordImpressionStats(DEDUPED, deduped);
          }
        }
      }

      // @TODO next block might be handled by the integration manager. In that case, the metadata object doesn't need to be passed in the constructor
      if (impressionListener || integrationsManager) {
        for (let i = 0; i < impressionsToListenerCount; i++) {
          const impressionData: SplitIO.ImpressionData = {
            // copy of impression, to avoid unexpected behaviour if modified by integrations or impressionListener
            impression: objectAssign({}, impressionsToListener[i]),
            attributes,
            ip,
            hostname,
            sdkLanguageVersion: version
          };

          // Wrap in a timeout because we don't want it to be blocking.
          setTimeout(function () {
            // integrationsManager.handleImpression does not throw errors
            if (integrationsManager) integrationsManager.handleImpression(impressionData);

            try { // @ts-ignore. An exception on the listeners should not break the SDK.
              if (impressionListener) impressionListener.logImpression(impressionData);
            } catch (err) {
              log.error(ERROR_IMPRESSIONS_LISTENER, [err]);
            }
          }, 0);
        }
      }
    }
  };
}
