import { thenable } from '../utils/promise/thenable';
import { getMatching } from '../utils/key';
import { validateTrafficTypeExistence } from '../utils/inputValidation/trafficTypeExistence';
import { validateKey, validateTrafficType, validateEvent, validateEventValue, validateEventProperties, validateIfNotDestroyed } from '../utils/inputValidation';
import { TRACK, TRACK_FN_LABEL } from '../utils/constants';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import SplitIO from '../../types/splitio';
import { ISdkFactoryContext } from '../sdkFactory/types';

/**
 * Creates a standalone `track` function with input validation.
 * Reusable by FF SDK client, Configs SDK, and thin-client SDK.
 */
export function trackMethodFactory(params: Pick<ISdkFactoryContext, 'settings' | 'eventTracker' | 'telemetryTracker' | 'storage' | 'sdkReadinessManager'>, warnTTExistence = true) {
  const { settings, storage: { splits }, telemetryTracker, eventTracker, sdkReadinessManager: { readinessManager } } = params;
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

    const eventData: SplitIO.EventData = {
      eventTypeId,
      trafficTypeName,
      value,
      timestamp: Date.now(),
      key: getMatching(key),
      properties: properties as SplitIO.Properties | undefined
    };

    // This may be async but we only warn, we don't actually care if it is valid or not in terms of queueing the event.
    if (warnTTExistence) validateTrafficTypeExistence(log, readinessManager, splits, mode, trafficTypeName, TRACK_FN_LABEL);

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
