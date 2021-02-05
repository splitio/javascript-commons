import { ControlType, PUSH_CONNECT, PUSH_DISABLED, PUSH_DISCONNECT } from '../constants';
import { IPushEventEmitter } from '../types';

const CONTROL_PRI_CHANNEL_REGEX = /control_pri$/;

/**
 * Factory of notification keeper, which process OCCUPANCY and CONTROL notifications and emits the corresponding push events.
 *
 * @param pushEmitter emitter for events related to streaming support
 */
// @TODO update logic to handle OCCUPANCY for any region and rename according to new spec (e.g.: PUSH_CONNECT --> PUSH_SUBSYSTEM_UP)
export default function notificationKeeperFactory(pushEmitter: IPushEventEmitter) {

  let occupancyTimestamp = -1;
  let hasPublishers = true; // false if the number of publishers is equal to 0 in the last OCCUPANCY notification from CHANNEL_PRI
  let controlTimestamp = -1;
  let hasResumed = true; // false if last CONTROL event was STREAMING_PAUSED or STREAMING_DISABLED

  return {
    handleOpen() {
      pushEmitter.emit(PUSH_CONNECT);
    },

    isStreamingUp() {
      return hasResumed && hasPublishers;
    },

    handleOccupancyEvent(publishers: number, channel: string, timestamp: number) {
      if (CONTROL_PRI_CHANNEL_REGEX.test(channel) && timestamp > occupancyTimestamp) {
        occupancyTimestamp = timestamp;
        if (hasResumed) {
          if (publishers === 0 && hasPublishers) {
            pushEmitter.emit(PUSH_DISCONNECT); // notify(STREAMING_DOWN) in spec
          } else if (publishers !== 0 && !hasPublishers) {
            pushEmitter.emit(PUSH_CONNECT); // notify(STREAMING_UP) in spec
          }
          // nothing to do when hasResumed === false:
          // streaming is already down for `publishers === 0`, and cannot be up for `publishers !== 0`
        }
        hasPublishers = publishers !== 0;
      }
    },

    handleControlEvent(controlType: ControlType, channel: string, timestamp: number) {
      if (CONTROL_PRI_CHANNEL_REGEX.test(channel) && timestamp > controlTimestamp) {
        controlTimestamp = timestamp;
        if (controlType === ControlType.STREAMING_DISABLED) {
          pushEmitter.emit(PUSH_DISABLED);
        } else if (hasPublishers) {
          if (controlType === ControlType.STREAMING_PAUSED && hasResumed) {
            pushEmitter.emit(PUSH_DISCONNECT); // notify(STREAMING_DOWN) in spec
          } else if (controlType === ControlType.STREAMING_RESUMED && !hasResumed) {
            pushEmitter.emit(PUSH_CONNECT); // notify(STREAMING_UP) in spec
          }
          // nothing to do when hasPublishers === false:
          // streaming is already down for `STREAMING_PAUSED`, and cannot be up for `STREAMING_RESUMED`
        }
        hasResumed = controlType === ControlType.STREAMING_RESUMED;
      }
    },

  };
}
