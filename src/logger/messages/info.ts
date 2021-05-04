import * as c from '../constants';
import { codesWarn } from './warn';

const READY_MSG = 'Split SDK is ready';

export const codesInfo: [number, string][] = codesWarn.concat([
  // client status
  [c.CLIENT_READY_FROM_CACHE, READY_MSG + ' from cache'],
  [c.CLIENT_READY, READY_MSG],
  // SDK
  [c.IMPRESSION, c.LOG_PREFIX_IMPRESSIONS_TRACKER +'Split: %s. Key: %s. Evaluation: %s. Label: %s'],
  [c.IMPRESSION_QUEUEING, c.LOG_PREFIX_IMPRESSIONS_TRACKER +'Queueing corresponding impression.'],
  [c.NEW_SHARED_CLIENT, ' New shared client instance created.'],
  [c.NEW_FACTORY, ' New Split SDK instance created.'],
  [c.EVENTS_TRACKER_SUCCESS, c.LOG_PREFIX_EVENTS_TRACKER + 'Successfully qeued %s'],
  [c.IMPRESSIONS_TRACKER_SUCCESS, c.LOG_PREFIX_IMPRESSIONS_TRACKER + 'Successfully stored %s impression(s).'],

  // synchronizer
  [c.POLLING_SMART_PAUSING, c.LOG_PREFIX_SYNC_POLLING + 'Turning segments data polling %s.'],
  [c.POLLING_START, c.LOG_PREFIX_SYNC_POLLING + 'Starting polling'],
  [c.POLLING_STOP, c.LOG_PREFIX_SYNC_POLLING + 'Stopping polling'],
  [c.SYNC_SPLITS_FETCH_RETRY, c.LOG_PREFIX_SYNC_SPLITS + 'Retrying download of splits #%s. Reason: %s'],
  [c.SUBMITTERS_PUSH_FULL_EVENTS_QUEUE, c.LOG_PREFIX_SYNC_SUBMITTERS + 'Flushing full events queue and reseting timer.'],
  [c.SUBMITTERS_PUSH, c.LOG_PREFIX_SYNC_SUBMITTERS + 'Pushing %s %s.'],
  [c.STREAMING_REFRESH_TOKEN, c.LOG_PREFIX_SYNC_STREAMING + 'Refreshing streaming token in %s seconds.'],
  [c.STREAMING_RECONNECT, c.LOG_PREFIX_SYNC_STREAMING + 'Attempting to reconnect in %s seconds.'],
  [c.STREAMING_CONNECTING, c.LOG_PREFIX_SYNC_STREAMING + 'Connecting to streaming.'],
  [c.STREAMING_DISABLED, c.LOG_PREFIX_SYNC_STREAMING + 'Streaming is disabled for given Api key. Switching to polling mode.'],
  [c.STREAMING_DISCONNECTING, c.LOG_PREFIX_SYNC_STREAMING + 'Disconnecting from streaming.'],
  [c.SYNC_START_POLLING, c.LOG_PREFIX_SYNC_MANAGER + 'Streaming not available. Starting polling.'],
  [c.SYNC_CONTINUE_POLLING, c.LOG_PREFIX_SYNC_MANAGER + 'Streaming couldn\'t connect. Continue polling.'],
  [c.SYNC_STOP_POLLING, c.LOG_PREFIX_SYNC_MANAGER + 'Streaming (re)connected. Syncing and stopping polling.'],
]);
