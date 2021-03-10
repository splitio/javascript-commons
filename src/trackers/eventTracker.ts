import objectAssign from 'object-assign';
import thenable from '../utils/promise/thenable';
import { IEventsCacheBase } from '../storages/types';
import { IEventsHandler, IEventTracker } from './types';
import { SplitIO } from '../types';
import { ILogger } from '../logger/types';
import { INFO_21, WARN_11 } from '../logger/codesConstants';
// import { logFactory } from '../logger/sdkLogger';
// const log = logFactory('splitio-client:event-tracker');

/**
 * Event tracker stores events in cache and pass them to the integrations manager if provided.
 *
 * @param eventsCache cache to save events
 * @param integrationsManager optional event handler used for integrations
 */
export default function eventTrackerFactory(
  log: ILogger,
  eventsCache: IEventsCacheBase,
  integrationsManager?: IEventsHandler
): IEventTracker {

  function queueEventsCallback(eventData: SplitIO.EventData, tracked: boolean) {
    const { eventTypeId, trafficTypeName, key, value, timestamp, properties } = eventData;
    // Logging every prop would be too much.
    const msg = `event of type "${eventTypeId}" for traffic type "${trafficTypeName}". Key: ${key}. Value: ${value}. Timestamp: ${timestamp}. ${properties ? 'With properties.' : 'With no properties.'}`;

    if (tracked) {
      log.info(INFO_21, [msg]);
      if (integrationsManager) {
        // Wrap in a timeout because we don't want it to be blocking.
        setTimeout(function () {
          // copy of event, to avoid unexpected behaviour if modified by integrations
          const eventDataCopy = objectAssign({}, eventData);
          if (eventData.properties) eventDataCopy.properties = objectAssign({}, eventData.properties);
          // integrationsManager does not throw errors (they are internally handled by each integration module)
          integrationsManager.handleEvent(eventDataCopy);
        }, 0);
      }
    } else {
      log.warn(WARN_11, [msg]);
    }

    return tracked;
  }

  return {
    track(eventData: SplitIO.EventData, size?: number) {
      const tracked = eventsCache.track(eventData, size);

      if (thenable(tracked)) {
        return tracked.then(queueEventsCallback.bind(null, eventData));
      } else {
        return queueEventsCallback(eventData, tracked);
      }
    }
  };
}
