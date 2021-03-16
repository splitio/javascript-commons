import { errorParser, messageParser } from './NotificationParser';
import notificationKeeperFactory from './NotificationKeeper';
import { PUSH_RETRYABLE_ERROR, PUSH_NONRETRYABLE_ERROR, OCCUPANCY, CONTROL, MY_SEGMENTS_UPDATE, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE } from '../constants';
import { IPushEventEmitter } from '../types';
import { ISseEventHandler } from '../SSEClient/types';
import { INotificationError } from './types';
import { ILogger } from '../../../logger/types';
import { WARN_6, ERROR_9, WARN_7, DEBUG_46 } from '../../../logger/constants';

function isRetryableError(error: INotificationError) {
  if (error.parsedData && error.parsedData.code) {
    const code = error.parsedData.code;
    // 401 errors due to invalid or expired token (e.g., if refresh token coudn't be executed)
    if (40140 <= code && code <= 40149) return true;
    // Others 4XX errors (e.g., bad request from the SDK)
    if (40000 <= code && code <= 49999) return false;
  }
  // network errors or 5XX HTTP errors
  return true;
}

/**
 * Factory for SSEHandler, which processes SSEClient messages and emits the corresponding push events.
 *
 * @param log factory logger
 * @param pushEmitter emitter for events related to streaming support
 */
export default function SSEHandlerFactory(log: ILogger, pushEmitter: IPushEventEmitter): ISseEventHandler {

  const notificationKeeper = notificationKeeperFactory(pushEmitter);

  return {
    handleOpen() {
      notificationKeeper.handleOpen();
    },

    /* HTTP & Network errors */
    handleError(error) {
      let errorWithParsedData: INotificationError = error;
      try {
        errorWithParsedData = errorParser(error);
      } catch (err) {
        log.warn(WARN_6, [err]);
      }

      let errorMessage = errorWithParsedData.parsedData && errorWithParsedData.parsedData.message;
      log.error(ERROR_9, [errorMessage]);

      if (isRetryableError(errorWithParsedData)) {
        pushEmitter.emit(PUSH_RETRYABLE_ERROR);
      } else {
        pushEmitter.emit(PUSH_NONRETRYABLE_ERROR);
      }
    },

    /* NotificationProcessor */
    handleMessage(message) {
      let messageWithParsedData;
      try {
        messageWithParsedData = messageParser(message);
      } catch (err) {
        log.warn(WARN_7, [err]);
        return;
      }

      const { parsedData, data, channel, timestamp } = messageWithParsedData;
      log.debug(DEBUG_46, [data]);

      // we only handle update events if streaming is up.
      if (!notificationKeeper.isStreamingUp() && parsedData.type !== OCCUPANCY && parsedData.type !== CONTROL)
        return;

      switch (parsedData.type) {
        /* update events */
        case SPLIT_UPDATE:
          pushEmitter.emit(SPLIT_UPDATE,
            parsedData.changeNumber);
          break;
        case SEGMENT_UPDATE:
          pushEmitter.emit(SEGMENT_UPDATE,
            parsedData.changeNumber,
            parsedData.segmentName);
          break;
        case MY_SEGMENTS_UPDATE:
          pushEmitter.emit(MY_SEGMENTS_UPDATE,
            parsedData,
            channel);
          break;
        case SPLIT_KILL:
          pushEmitter.emit(SPLIT_KILL,
            parsedData.changeNumber,
            parsedData.splitName,
            parsedData.defaultTreatment);
          break;

        /* occupancy & control events, handled by NotificationManagerKeeper */
        case OCCUPANCY:
          notificationKeeper.handleOccupancyEvent(parsedData.metrics.publishers, channel, timestamp);
          break;
        case CONTROL:
          notificationKeeper.handleControlEvent(parsedData.controlType, channel, timestamp);
          break;
        default:
          break;
      }
    },

  };
}
