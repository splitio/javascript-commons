import { CLIENT_READY_FROM_CACHE, CLIENT_READY, IMPRESSION, IMPRESSION_QUEUEING, NEW_SHARED_CLIENT, NEW_FACTORY, POLLING_SMART_PAUSING, POLLING_START, POLLING_STOP, SYNC_SPLITS_FETCH_RETRY, STREAMING_REFRESH_TOKEN, STREAMING_RECONNECT, STREAMING_CONNECTING, STREAMING_DISABLED, STREAMING_DISCONNECTING, SUBMITTERS_PUSH_FULL_EVENTS_QUEUE, SUBMITTERS_PUSH, SYNC_START_POLLING, SYNC_CONTINUE_POLLING, SYNC_STOP_POLLING, EVENTS_TRACKER_SUCCESS, logPrefixEventsTracker, logPrefixSyncManager, logPrefixSyncPolling, logPrefixSyncSplits, logPrefixSyncStreaming, logPrefixSyncSubmitters, logPrefixImpressionsTracker, IMPRESSIONS_TRACKER_SUCCESS } from '../constants';
import { codesWarn } from './warn';

const READY_MSG = 'Split SDK is ready';

export const codesInfo: [number, string][] = codesWarn.concat([
  // client status
  [CLIENT_READY_FROM_CACHE, READY_MSG + ' from cache'],
  [CLIENT_READY, READY_MSG],
  // SDK
  [IMPRESSION, logPrefixImpressionsTracker +'Split: %s. Key: %s. Evaluation: %s. Label: %s'],
  [IMPRESSION_QUEUEING, logPrefixImpressionsTracker +'Queueing corresponding impression.'],
  [NEW_SHARED_CLIENT, ' New shared client instance created.'],
  [NEW_FACTORY, ' New Split SDK instance created.'],
  [EVENTS_TRACKER_SUCCESS, logPrefixEventsTracker + 'Successfully qeued %s'],
  [IMPRESSIONS_TRACKER_SUCCESS, logPrefixImpressionsTracker + 'Successfully stored %s impression(s).'],

  // synchronizer
  [POLLING_SMART_PAUSING, logPrefixSyncPolling + 'Turning segments data polling %s.'],
  [POLLING_START, logPrefixSyncPolling + 'Starting polling'],
  [POLLING_STOP, logPrefixSyncPolling + 'Stopping polling'],
  [SYNC_SPLITS_FETCH_RETRY, logPrefixSyncSplits + 'Retrying download of splits #%s. Reason: %s'],
  [SUBMITTERS_PUSH_FULL_EVENTS_QUEUE, logPrefixSyncSubmitters + 'Flushing full events queue and reseting timer.'],
  [SUBMITTERS_PUSH, logPrefixSyncSubmitters + 'Pushing %s %s.'],
  [STREAMING_REFRESH_TOKEN, logPrefixSyncStreaming + 'Refreshing streaming token in %s seconds.'],
  [STREAMING_RECONNECT, logPrefixSyncStreaming + 'Attempting to reconnect in %s seconds.'],
  [STREAMING_CONNECTING, logPrefixSyncStreaming + 'Connecting to streaming.'],
  [STREAMING_DISABLED, logPrefixSyncStreaming + 'Streaming is disabled for given Api key. Switching to polling mode.'],
  [STREAMING_DISCONNECTING, logPrefixSyncStreaming + 'Disconnecting from streaming.'],
  [SYNC_START_POLLING, logPrefixSyncManager + 'Streaming not available. Starting polling.'],
  [SYNC_CONTINUE_POLLING, logPrefixSyncManager + 'Streaming couldn\'t connect. Continue polling.'],
  [SYNC_STOP_POLLING, logPrefixSyncManager + 'Streaming (re)connected. Syncing and stopping polling.'],
]);
