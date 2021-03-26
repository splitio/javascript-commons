import * as c from '../constants';
import { codesWarn } from './warn';

const READY_MSG = 'Split SDK is ready';

export const codesInfo: [number, string][] = codesWarn.concat([
  // client status
  [c.CLIENT_READY_FROM_CACHE, READY_MSG + ' from cache'],
  [c.CLIENT_READY, READY_MSG],
  // SDK
  [c.IMPRESSION, c.logPrefixImpressionsTracker +'Split: %s. Key: %s. Evaluation: %s. Label: %s'],
  [c.IMPRESSION_QUEUEING, c.logPrefixImpressionsTracker +'Queueing corresponding impression.'],
  [c.NEW_SHARED_CLIENT, ' New shared client instance created.'],
  [c.NEW_FACTORY, ' New Split SDK instance created.'],
  [c.EVENTS_TRACKER_SUCCESS, c.logPrefixEventsTracker + 'Successfully qeued %s'],
  [c.IMPRESSIONS_TRACKER_SUCCESS, c.logPrefixImpressionsTracker + 'Successfully stored %s impression(s).'],

  // synchronizer
  [c.POLLING_SMART_PAUSING, c.logPrefixSyncPolling + 'Turning segments data polling %s.'],
  [c.POLLING_START, c.logPrefixSyncPolling + 'Starting polling'],
  [c.POLLING_STOP, c.logPrefixSyncPolling + 'Stopping polling'],
  [c.SYNC_SPLITS_FETCH_RETRY, c.logPrefixSyncSplits + 'Retrying download of splits #%s. Reason: %s'],
  [c.SUBMITTERS_PUSH_FULL_EVENTS_QUEUE, c.logPrefixSyncSubmitters + 'Flushing full events queue and reseting timer.'],
  [c.SUBMITTERS_PUSH, c.logPrefixSyncSubmitters + 'Pushing %s %s.'],
  [c.STREAMING_REFRESH_TOKEN, c.logPrefixSyncStreaming + 'Refreshing streaming token in %s seconds.'],
  [c.STREAMING_RECONNECT, c.logPrefixSyncStreaming + 'Attempting to reconnect in %s seconds.'],
  [c.STREAMING_CONNECTING, c.logPrefixSyncStreaming + 'Connecting to streaming.'],
  [c.STREAMING_DISABLED, c.logPrefixSyncStreaming + 'Streaming is disabled for given Api key. Switching to polling mode.'],
  [c.STREAMING_DISCONNECTING, c.logPrefixSyncStreaming + 'Disconnecting from streaming.'],
  [c.SYNC_START_POLLING, c.logPrefixSyncManager + 'Streaming not available. Starting polling.'],
  [c.SYNC_CONTINUE_POLLING, c.logPrefixSyncManager + 'Streaming couldn\'t connect. Continue polling.'],
  [c.SYNC_STOP_POLLING, c.logPrefixSyncManager + 'Streaming (re)connected. Syncing and stopping polling.'],
]);
