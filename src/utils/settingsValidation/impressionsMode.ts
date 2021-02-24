import { SplitIO } from '../../types';
import { DEBUG, OPTIMIZED } from '../constants';
import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-settings');

export default function validImpressionsMode(impressionsMode: string): SplitIO.ImpressionsMode {
  impressionsMode = impressionsMode.toUpperCase();
  if ([DEBUG, OPTIMIZED].indexOf(impressionsMode) === -1) {
    log.e(`You passed an invalid impressionsMode, impressionsMode should be one of the following values: '${DEBUG}' or '${OPTIMIZED}'. Defaulting to '${OPTIMIZED}' mode.`);
    impressionsMode = OPTIMIZED;
  }

  return impressionsMode as SplitIO.ImpressionsMode;
}
