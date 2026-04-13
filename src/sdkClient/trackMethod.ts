import { thenable } from '../utils/promise/thenable';
import { getMatching } from '../utils/key';
import { validateTrafficTypeExistence } from '../utils/inputValidation/trafficTypeExistence';
import { validateKey, validateTrafficType, validateEvent, validateEventValue, validateEventProperties, validateIfNotDestroyed } from '../utils/inputValidation';
import { TRACK, TRACK_FN_LABEL } from '../utils/constants';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import SplitIO from '../../types/splitio';
import { IReadinessManager } from '../readiness/types';
import { IEventTracker, ITelemetryTracker } from '../trackers/types';
import { ISettings } from '../types';
import { ISplitsCacheBase } from '../storages/types';

export interface ITrackDeps {
  settings: ISettings,
  eventTracker: IEventTracker,
  telemetryTracker: ITelemetryTracker,
  readinessManager: IReadinessManager,
  definitions: ISplitsCacheBase,
}

/**
 * Creates a standalone `track` function with input validation.
 * Reusable by FF SDK client, Configs SDK, and thin-client SDK.
 */
export function trackMethodFactory(deps: ITrackDeps) {
  const { settings, definitions, telemetryTracker, eventTracker, readinessManager } = deps;
  const { log, mode } = settings;
  const isAsync = isConsumerMode(mode);

  return function track(maybeKey: SplitIO.SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: SplitIO.Properties) {
    // Input validation
    const key = validateKey(log, maybeKey, TRACK_FN_LABEL);
    const trafficTypeName = validateTrafficType(log, maybeTT, TRACK_FN_LABEL);
    const eventTypeId = validateEvent(log, maybeEvent, TRACK_FN_LABEL);
    const value = validateEventValue(log, maybeEventValue, TRACK_FN_LABEL);
    const { properties, size } = validateEventProperties(log, maybeProperties, TRACK_FN_LABEL);
    const isNotDestroyed = validateIfNotDestroyed(log, readinessManager, TRACK_FN_LABEL);

    if (!(isNotDestroyed && key && trafficTypeName && eventTypeId && value !== false && properties !== false)) {
      return isAsync ? Promise.resolve(false) : false;
    }

    // Core logic
    const stopTelemetryTracker = telemetryTracker.trackEval(TRACK);

    const matchingKey = getMatching(key);
    const timestamp = Date.now();
    const eventData: SplitIO.EventData = {
      eventTypeId,
      trafficTypeName,
      value,
      timestamp,
      key: matchingKey,
      properties: properties as SplitIO.Properties | undefined
    };

    // This may be async but we only warn, we don't actually care if it is valid or not in terms of queueing the event.
    validateTrafficTypeExistence(log, readinessManager, definitions, mode, trafficTypeName, TRACK_FN_LABEL);

    const result = eventTracker.track(eventData, size);

    if (thenable(result)) {
      return result.then((result) => {
        stopTelemetryTracker();
        return result;
      });
    } else {
      stopTelemetryTracker();
      return result;
    }
  };
}
