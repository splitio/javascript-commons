import { ITelemetryTracker } from '../../../trackers/types';
import { CONNECTION_ESTABLISHED, DISABLED, ENABLED, OCCUPANCY_PRI, OCCUPANCY_SEC, PAUSED, STREAMING_STATUS } from '../../../utils/constants';
import { StreamingEventType } from '../../submitters/types';
import { ControlType, PUSH_SUBSYSTEM_UP, PUSH_NONRETRYABLE_ERROR, PUSH_SUBSYSTEM_DOWN } from '../constants';
import { IPushEventEmitter } from '../types';

const CONTROL_CHANNEL_REGEXS = [/control_pri$/, /control_sec$/];
const STREAMING_EVENT_TYPES: StreamingEventType[] = [OCCUPANCY_PRI, OCCUPANCY_SEC];

/**
 * Factory of notification keeper, which process OCCUPANCY and CONTROL notifications and emits the corresponding push events.
 *
 * @param pushEmitter emitter for events related to streaming support
 */
// @TODO update logic to handle OCCUPANCY for any region and rename according to new spec (e.g.: PUSH_SUBSYSTEM_UP --> PUSH_SUBSYSTEM_UP)
export function notificationKeeperFactory(pushEmitter: IPushEventEmitter, telemetryTracker: ITelemetryTracker) {

  let channels = CONTROL_CHANNEL_REGEXS.map(regex => ({
    regex,
    hasPublishers: true, // keep track of publishers presence per channel, in order to compute `hasPublishers`. Init with true, to emit PUSH_SUBSYSTEM_UP if initial OCCUPANCY notifications have 0 publishers
    oTime: -1, // keep track of most recent occupancy notification timestamp per channel
    cTime: -1 // keep track of most recent control notification timestamp per channel
  }));

  // false if the number of publishers is equal to 0 in all regions
  let hasPublishers = true;

  // false if last CONTROL event was STREAMING_PAUSED or STREAMING_DISABLED
  let hasResumed = true;

  function getHasPublishers() { // computes the value of `hasPublishers`
    return channels.some(c => c.hasPublishers);
  }

  return {
    handleOpen() {
      telemetryTracker.streamingEvent(CONNECTION_ESTABLISHED);
      pushEmitter.emit(PUSH_SUBSYSTEM_UP);
    },

    isStreamingUp() {
      return hasResumed && hasPublishers;
    },

    handleOccupancyEvent(publishers: number, channel: string, timestamp: number) {
      for (let i = 0; i < channels.length; i++) {
        const c = channels[i];
        if (c.regex.test(channel)) {
          telemetryTracker.streamingEvent(STREAMING_EVENT_TYPES[i], publishers);

          if (timestamp > c.oTime) {
            c.oTime = timestamp;
            c.hasPublishers = publishers !== 0;
            const hasPublishersNow = getHasPublishers();
            if (hasResumed) {
              if (!hasPublishersNow && hasPublishers) {
                pushEmitter.emit(PUSH_SUBSYSTEM_DOWN);
              } else if (hasPublishersNow && !hasPublishers) {
                pushEmitter.emit(PUSH_SUBSYSTEM_UP);
              }
              // nothing to do when hasResumed === false:
              // streaming is already down for `!hasPublishersNow`, and cannot be up for `hasPublishersNow`
            }
            hasPublishers = hasPublishersNow;
          }
          return;
        }
      }
    },

    handleControlEvent(controlType: ControlType, channel: string, timestamp: number) {
      /* STREAMING_RESET control event is handled by PushManager directly since it doesn't require
       * tracking timestamp and state like OCCUPANCY or CONTROL. It also ignores previous
       * OCCUPANCY and CONTROL notifications, and whether PUSH_SUBSYSTEM_DOWN has been emitted or not */
      if (controlType === ControlType.STREAMING_RESET) {
        pushEmitter.emit(controlType);
        return;
      }

      for (let i = 0; i < channels.length; i++) {
        const c = channels[i];
        if (c.regex.test(channel)) {
          if (timestamp > c.cTime) {
            c.cTime = timestamp;
            if (controlType === ControlType.STREAMING_DISABLED) {
              telemetryTracker.streamingEvent(STREAMING_STATUS, DISABLED);
              pushEmitter.emit(PUSH_NONRETRYABLE_ERROR);
            } else if (hasPublishers) {
              if (controlType === ControlType.STREAMING_PAUSED && hasResumed) {
                telemetryTracker.streamingEvent(STREAMING_STATUS, PAUSED);
                pushEmitter.emit(PUSH_SUBSYSTEM_DOWN);
              } else if (controlType === ControlType.STREAMING_RESUMED && !hasResumed) {
                telemetryTracker.streamingEvent(STREAMING_STATUS, ENABLED);
                pushEmitter.emit(PUSH_SUBSYSTEM_UP);
              }
              // nothing to do when hasPublishers === false:
              // streaming is already down for `STREAMING_PAUSED`, and cannot be up for `STREAMING_RESUMED`
            }
            hasResumed = controlType === ControlType.STREAMING_RESUMED;
          }
          return;
        }
      }
    },

  };
}
