import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { truncateTimeFrame } from '../utils/time';
import { IImpressionCountsCacheSync, IImpressionsCacheBase } from '../storages/types';
import { IImpressionsHandler, IImpressionsTracker } from './types';
import { SplitIO, ImpressionDTO, ISettings } from '../types';
import { IImpressionObserver } from './impressionObserver/types';
import { IMPRESSIONS_TRACKER_SUCCESS, ERROR_IMPRESSIONS_TRACKER, ERROR_IMPRESSIONS_LISTENER } from '../logger/constants';
import { CONSENT_DECLINED } from '../utils/constants';

/**
 * Impressions tracker stores impressions in cache and pass them to the listener and integrations manager if provided.
 *
 * @param impressionsCache cache to save impressions
 * @param metadata runtime metadata (ip, hostname and version)
 * @param impressionListener optional impression listener
 * @param integrationsManager optional integrations manager
 * @param observer optional impression observer. If provided, previous time (pt property) is included in impression instances
 * @param countsCache optional cache to save impressions count. If provided, impressions will be deduped (OPTIMIZED mode)
 */
export function impressionsTrackerFactory(
  settings: ISettings,
  impressionsCache: IImpressionsCacheBase,
  integrationsManager?: IImpressionsHandler,
  // if observer is provided, it implies `shouldAddPreviousTime` flag (i.e., if impressions previous time should be added or not)
  observer?: IImpressionObserver,
  // if countsCache is provided, it implies `isOptimized` flag (i.e., if impressions should be deduped or not)
  countsCache?: IImpressionCountsCacheSync
): IImpressionsTracker {

  const { log, impressionListener, runtime: { ip, hostname }, version } = settings;

  return {
    track(impressions: ImpressionDTO[], attributes?: SplitIO.Attributes) {
      if (settings.userConsent === CONSENT_DECLINED) return;

      const impressionsCount = impressions.length;

      const impressionsToStore: ImpressionDTO[] = []; // Track only the impressions that are going to be stored
      // Wraps impressions to store and adds previousTime if it corresponds
      impressions.forEach((impression) => {
        if (observer) {
          // Adds previous time if it is enabled
          impression.pt = observer.testAndSet(impression);
        }

        const now = Date.now();
        if (countsCache) {
          // Increments impression counter per featureName
          countsCache.track(impression.feature, now, 1);
        }

        // Checks if the impression should be added in queue to be sent
        if (!countsCache || !impression.pt || impression.pt < truncateTimeFrame(now)) {
          impressionsToStore.push(impression);
        }
      });

      const res = impressionsCache.track(impressionsToStore);

      // If we're on an async storage, handle error and log it.
      if (thenable(res)) {
        res.then(() => {
          log.info(IMPRESSIONS_TRACKER_SUCCESS, [impressionsCount]);
        }).catch(err => {
          log.error(ERROR_IMPRESSIONS_TRACKER, [impressionsCount, err]);
        });
      }

      // @TODO next block might be handled by the integration manager. In that case, the metadata object doesn't need to be passed in the constructor
      if (impressionListener || integrationsManager) {
        for (let i = 0; i < impressionsCount; i++) {
          const impressionData: SplitIO.ImpressionData = {
            // copy of impression, to avoid unexpected behaviour if modified by integrations or impressionListener
            impression: objectAssign({}, impressions[i]),
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
