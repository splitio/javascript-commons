import { DEBUG_28, DEBUG_29, DEBUG_30, DEBUG_39, DEBUG_40, DEBUG_41, DEBUG_34, DEBUG_35, DEBUG_37, DEBUG_38 } from '../constants';

export const codesDebugNode: [number, string][] = [
  [DEBUG_28, 'splitio-client:cleanup => Registering cleanup handlers.'],
  [DEBUG_29, 'splitio-client:cleanup => Deregistering cleanup handlers.'],
  [DEBUG_30, 'splitio-client:cleanup => Split SDK graceful shutdown after SIGTERM.'],
  [DEBUG_39, 'splitio-sync:segment-changes => Processed %s with till = %s. Added: %s. Removed: %s'],
  [DEBUG_40, 'splitio-sync:segment-changes => Processing segment %s'],
  [DEBUG_41, 'splitio-sync:segment-changes => Started segments update'],
  [DEBUG_34, 'splitio-offline:splits-fetcher => Ignoring empty line or comment at #%s'],
  [DEBUG_35, 'splitio-offline:splits-fetcher => Ignoring line since it does not have exactly two columns #%s'],
  [DEBUG_37, 'splitio-sync:polling-manager => Splits will be refreshed each %s millis'], // @TODO remove since we already log it in syncTask debug log?
  [DEBUG_38, 'splitio-sync:polling-manager => Segments will be refreshed each %s millis'], // @TODO remove since we already log it in syncTask debug log?
];
