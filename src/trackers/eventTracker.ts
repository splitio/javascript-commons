import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { IEventsCacheBase, ITelemetryCacheAsync, ITelemetryCacheSync } from '../storages/types';
import { IEventsHandler, IEventTracker } from './types';
import { ISettings, SplitIO } from '../types';
import { EVENTS_TRACKER_SUCCESS, ERROR_EVENTS_TRACKER } from '../logger/constants';
import { CONSENT_DECLINED, DROPPED, QUEUED } from '../utils/constants';
import { isStorageSync } from './impressionObserver/utils';

/**
 * Event tracker stores events in cache and pass them to the integrations manager if provided.
 *
 * @param eventsCache cache to save events
 * @param integrationsManager optional event handler used for integrations
 */
export function eventTrackerFactory(
  settings: ISettings,
  eventsCache: IEventsCacheBase,
  integrationsManager?: IEventsHandler,
  telemetryCache?: ITelemetryCacheSync | ITelemetryCacheAsync
): IEventTracker {

  const log = settings.log;
  const isSync = isStorageSync(settings);

  function queueEventsCallback(eventData: SplitIO.EventData, tracked: boolean) {
    const { eventTypeId, trafficTypeName, key, value, timestamp, properties } = eventData;
    // Logging every prop would be too much.
    const msg = `event of type "${eventTypeId}" for traffic type "${trafficTypeName}". Key: ${key}. Value: ${value}. Timestamp: ${timestamp}. ${properties ? 'With properties.' : 'With no properties.'}`;

    if (tracked) {
      log.info(EVENTS_TRACKER_SUCCESS, [msg]);
      if (integrationsManager) {
        // Wrap in a timeout because we don't want it to be blocking.
        setTimeout(function () {
          // copy of event, to avoid unexpected behaviour if modified by integrations
          const eventDataCopy = objectAssign({}, eventData);
          if (properties) eventDataCopy.properties = objectAssign({}, properties);
          // integrationsManager does not throw errors (they are internally handled by each integration module)
          integrationsManager.handleEvent(eventDataCopy);
        }, 0);
      }
    } else {
      log.error(ERROR_EVENTS_TRACKER, [msg]);
    }

    return tracked;
  }

  return {
    track(eventData: SplitIO.EventData, size?: number) {
      if (settings.userConsent === CONSENT_DECLINED) {
        return isSync ? false : Promise.resolve(false);
      }

      const tracked = eventsCache.track(eventData, size);

      if (thenable(tracked)) {
        return tracked.then(queueEventsCallback.bind(null, eventData));
      } else {
        // Record when eventsCache is sync only (standalone mode)
        // @TODO we are not dropping events on full queue yet, so `tracked` is always true ATM
        if (telemetryCache) (telemetryCache as ITelemetryCacheSync).recordEventStats(tracked ? QUEUED : DROPPED, 1);
        return queueEventsCallback(eventData, tracked);
      }
    }
  };
}
