import { INFO_CLIENT_READY_FROM_CACHE, INFO_CLIENT_READY, INFO_2, INFO_3, INFO_4, INFO_5, INFO_6, INFO_7, INFO_8, INFO_9, INFO_10, INFO_11, INFO_12, INFO_13, INFO_14, INFO_15, INFO_16, INFO_17, INFO_18, INFO_19, INFO_20, INFO_21 } from '../constants';

const READY_MSG = 'Split SDK is ready';

export const codesInfo: [number, string][] = [
  // client status
  [INFO_CLIENT_READY_FROM_CACHE, READY_MSG + ' from cache'],
  [INFO_CLIENT_READY, READY_MSG],

  [INFO_2, 'splitio-client => Split: %s. Key: %s. Evaluation: %s. Label: %s'],
  [INFO_3, 'splitio-client => Queueing corresponding impression.'],
  [INFO_4, 'splitio => New shared client instance created.'],
  [INFO_5, 'splitio => New Split SDK instance created.'],
  [INFO_6, 'splitio => Manager instance retrieved.'],
  [INFO_7, 'splitio-sync:polling-manager => Turning segments data polling %s.'],
  [INFO_8, 'splitio-sync:polling-manager => Starting polling'],
  [INFO_9, 'splitio-sync:polling-manager => Stopping polling'],
  [INFO_10, 'splitio-sync:split-changes => Retrying download of splits #%s. Reason: %s'],
  [INFO_11, 'splitio-sync:push-manager => Refreshing streaming token in %s seconds.'],
  [INFO_12, 'splitio-sync:push-manager => Attempting to reconnect in %s seconds.'],
  [INFO_13, 'splitio-sync:push-manager => Connecting to push streaming.'],
  [INFO_14, 'splitio-sync:push-manager => Streaming is not available. Switching to polling mode.'],
  [INFO_15, 'splitio-sync:push-manager => Disconnecting from push streaming.'],
  [INFO_16, 'splitio-sync:submitters => Flushing full events queue and reseting timer.'],
  [INFO_17, 'splitio-sync:submitters => Pushing %s %s.'],
  [INFO_18, 'splitio-sync:sync-manager => Streaming not available. Starting periodic fetch of data.'],
  [INFO_19, 'splitio-sync:sync-manager => Streaming couldn\'t connect. Continue periodic fetch of data.'],
  [INFO_20, 'splitio-sync:sync-manager => PUSH (re)connected. Syncing and stopping periodic fetch of data.'],
  [INFO_21, 'splitio-client:event-tracker => Successfully qeued %s']
];
