import { DEBUG_28, DEBUG_29, DEBUG_30, DEBUG_39, DEBUG_40, DEBUG_41, DEBUG_34, DEBUG_35, DEBUG_37, DEBUG_38, CLEANUP_LB, SYNC_OFFLINE_LB, SYNC_POLLING_LB, SYNC_SEGMENTS_LB } from '../constants';

const HANDLER_LB = ' cleanup handlers.';

export const codesDebugNode: [number, string][] = [
  [DEBUG_28, CLEANUP_LB + 'Registering' + HANDLER_LB],
  [DEBUG_29, CLEANUP_LB + 'Deregistering' + HANDLER_LB],
  [DEBUG_30, CLEANUP_LB + 'Split SDK graceful shutdown after SIGTERM.'],
  // synchronizer
  [DEBUG_39, SYNC_SEGMENTS_LB + 'Processed %s with till = %s. Added: %s. Removed: %s'],
  [DEBUG_40, SYNC_SEGMENTS_LB + 'Processing segment %s'],
  [DEBUG_41, SYNC_SEGMENTS_LB + 'Started segments update'],
  [DEBUG_34, SYNC_OFFLINE_LB + 'Ignoring empty line or comment at #%s'],
  [DEBUG_35, SYNC_OFFLINE_LB + 'Ignoring line since it does not have exactly two columns #%s'],
  [DEBUG_37, SYNC_POLLING_LB + 'Splits will be refreshed each %s millis'], // @TODO remove since we already log it in syncTask debug log?
  [DEBUG_38, SYNC_POLLING_LB + 'Segments will be refreshed each %s millis'], // @TODO remove since we already log it in syncTask debug log?
];
