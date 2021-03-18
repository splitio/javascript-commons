import { CLEANUP_LB, DEBUG_26, DEBUG_27 } from '../constants';

const HANDLER_LB = ' flush handler when unload page event is triggered.';

export const codesDebugBrowser: [number, string][] = [
  [DEBUG_26, CLEANUP_LB + 'Registering' + HANDLER_LB],
  [DEBUG_27, CLEANUP_LB + 'Deregistering' + HANDLER_LB],
];
