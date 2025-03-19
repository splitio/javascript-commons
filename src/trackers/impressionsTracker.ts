import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { IImpressionsCacheBase, ITelemetryCacheSync, ITelemetryCacheAsync } from '../storages/types';
import { IImpressionsHandler, IImpressionsTracker, ImpressionDecorated, IStrategy } from './types';
import { ISettings } from '../types';
import { IMPRESSIONS_TRACKER_SUCCESS, ERROR_IMPRESSIONS_TRACKER, ERROR_IMPRESSIONS_LISTENER } from '../logger/constants';
import { CONSENT_DECLINED, DEDUPED, QUEUED } from '../utils/constants';
import SplitIO from '../../types/splitio';

/**
 * Impressions tracker stores impressions in cache and pass them to the listener and integrations manager if provided.
 */
export function impressionsTrackerFactory(
  settings: ISettings,
  impressionsCache: IImpressionsCacheBase,
  noneStrategy: IStrategy,
  strategy: IStrategy,
  whenInit: (cb: () => void) => void,
  integrationsManager?: IImpressionsHandler,
  telemetryCache?: ITelemetryCacheSync | ITelemetryCacheAsync,
): IImpressionsTracker {

  const { log, impressionListener, runtime: { ip, hostname }, version } = settings;

  return {
    track(impressions: ImpressionDecorated[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions) {
      if (settings.userConsent === CONSENT_DECLINED) return;

      const impressionsToStore = impressions.filter(({ imp, disabled }) => {
        if (options && options.properties) imp.properties = options.properties;

        return disabled ?
          noneStrategy.process(imp) :
          strategy.process(imp);
      });

      const impressionsLength = impressions.length;
      const impressionsToStoreLength = impressionsToStore.length;

      if (impressionsToStoreLength) {
        const res = impressionsCache.track(impressionsToStore.map((item) => item.imp));

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
          if (telemetryCache) {
            (telemetryCache as ITelemetryCacheSync).recordImpressionStats(QUEUED, impressionsToStoreLength);
            (telemetryCache as ITelemetryCacheSync).recordImpressionStats(DEDUPED, impressionsLength - impressionsToStoreLength);
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

          whenInit(() => {
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
          });
        }
      }
    }
  };
}
