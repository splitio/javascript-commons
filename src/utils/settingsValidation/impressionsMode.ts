import { ERROR_38 } from '../../logger/codesConstants';
import { ILogger } from '../../logger/types';
import { SplitIO } from '../../types';
import { DEBUG, OPTIMIZED } from '../constants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-settings');

export default function validImpressionsMode(log: ILogger, impressionsMode: string): SplitIO.ImpressionsMode {
  impressionsMode = impressionsMode.toUpperCase();
  if ([DEBUG, OPTIMIZED].indexOf(impressionsMode) === -1) {
    log.error(ERROR_38, [DEBUG, OPTIMIZED, OPTIMIZED]);
    impressionsMode = OPTIMIZED;
  }

  return impressionsMode as SplitIO.ImpressionsMode;
}
