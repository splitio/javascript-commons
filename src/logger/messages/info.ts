import { INFO_CLIENT_READY_FROM_CACHE, INFO_CLIENT_READY, INFO_2, INFO_3, INFO_4, INFO_5, INFO_6, INFO_7, INFO_8, INFO_9, INFO_10, INFO_11, INFO_12, INFO_13, INFO_14, INFO_15, INFO_16, INFO_17, INFO_18, INFO_19, INFO_20, INFO_21, EVENTS_TRACKER_LB, SYNC_POLLING_LB, SYNC_SPLITS_LB, SYNC_STREAMING_LB, SYNC_SUBMITTERS_LB, IMPRESSIONS_TRACKER_LB } from '../constants';

const READY_MSG = 'Split SDK is ready';

export const codesInfo: [number, string][] = [
  // client status
  [INFO_CLIENT_READY_FROM_CACHE, READY_MSG + ' from cache'],
  [INFO_CLIENT_READY, READY_MSG],
  // SDK
  [INFO_2, IMPRESSIONS_TRACKER_LB +'Split: %s. Key: %s. Evaluation: %s. Label: %s'],
  [INFO_3, IMPRESSIONS_TRACKER_LB +'Queueing corresponding impression.'],
  [INFO_4, ' New shared client instance created.'],
  [INFO_5, ' New Split SDK instance created.'],
  [INFO_6, ' Manager instance retrieved.'],
  // synchronizer
  [INFO_7, SYNC_POLLING_LB + 'Turning segments data polling %s.'],
  [INFO_8, SYNC_POLLING_LB + 'Starting polling'],
  [INFO_9, SYNC_POLLING_LB + 'Stopping polling'],
  [INFO_10, SYNC_SPLITS_LB + 'Retrying download of splits #%s. Reason: %s'],
  [INFO_16, SYNC_SUBMITTERS_LB + 'Flushing full events queue and reseting timer.'],
  [INFO_17, SYNC_SUBMITTERS_LB + 'Pushing %s %s.'],
  [INFO_11, SYNC_STREAMING_LB + 'Refreshing streaming token in %s seconds.'],
  [INFO_12, SYNC_STREAMING_LB + 'Attempting to reconnect in %s seconds.'],
  [INFO_13, SYNC_STREAMING_LB + 'Connecting to streaming.'],
  [INFO_14, SYNC_STREAMING_LB + 'Streaming is disabled for given Api key. Switching to polling mode.'],
  [INFO_15, SYNC_STREAMING_LB + 'Disconnecting from streaming.'],
  [INFO_18, SYNC_STREAMING_LB + 'Streaming not available. Starting polling.'],
  [INFO_19, SYNC_STREAMING_LB + 'Streaming couldn\'t connect. Continue polling.'],
  [INFO_20, SYNC_STREAMING_LB + 'Streaming (re)connected. Syncing and stopping polling.'],
  [INFO_21, EVENTS_TRACKER_LB + 'Successfully qeued %s']
];
