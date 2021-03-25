import objectAssign from 'object-assign';
import thenable from '../utils/promise/thenable';
import { truncateTimeFrame } from '../utils/time';
import { IImpressionCountsCacheBase, IImpressionsCacheBase } from '../storages/types';
import { IImpressionsHandler, IImpressionsTracker } from './types';
import { IMetadata } from '../dtos/types';
import { SplitIO, ImpressionDTO } from '../types';
import { IImpressionObserver } from './impressionObserver/types';
import { ILogger } from '../logger/types';
import { IMPRESSIONS_TRACKER_SUCCESS, ERROR_IMPRESSIONS_TRACKER, ERROR_IMPRESSIONS_LISTENER } from '../logger/constants';

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
export default function impressionsTrackerFactory(
  log: ILogger,
  impressionsCache: IImpressionsCacheBase,

  // @TODO consider passing only an optional integrationsManager to handle impressions
  { ip, hostname, version }: IMetadata,
  impressionListener?: SplitIO.IImpressionListener,
  integrationsManager?: IImpressionsHandler,

  // if observer is provided, it implies `shouldAddPreviousTime` flag (i.e., if impressions previous time should be added or not)
  observer?: IImpressionObserver,
  // if countsCache is provided, it implies `isOptimized` flag (i.e., if impressions should be deduped or not)
  countsCache?: IImpressionCountsCacheBase
): IImpressionsTracker {

  return {
    track(impressions: ImpressionDTO[], attributes?: SplitIO.Attributes) {
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
          log.debug(IMPRESSIONS_TRACKER_SUCCESS, [impressionsCount, impressionsCount === 1 ? '' : 's']);
        }).catch(err => {
          log.error(ERROR_IMPRESSIONS_TRACKER, [impressionsCount, impressionsCount === 1 ? '' : 's', err]);
        });
      }

      // @TODO next block might be handled by the integration manager. In that case, the metadata object doesn't need to be passed in the constructor
      if (impressionListener || integrationsManager) {
        for (let i = 0; i < impressionsCount; i++) {
          const impressionData: SplitIO.ImpressionData = {
            // copy of impression, to avoid unexpected behaviour if modified by integrations or impressionListener
            impression: objectAssign({}, impressions[i]),
            attributes,
            ip: ip as string,
            hostname: hostname as string,
            sdkLanguageVersion: version
          };

          // Wrap in a timeout because we don't want it to be blocking.
          setTimeout(function () {
            // integrationsManager.handleImpression does not throw errors
            if (integrationsManager) integrationsManager.handleImpression(impressionData);

            try { // An exception on the listeners should not break the SDK.
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
