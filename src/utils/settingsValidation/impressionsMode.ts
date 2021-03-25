import { ERROR_INVALID_IMPRESSIONS_MODE } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { SplitIO } from '../../types';
import { DEBUG, OPTIMIZED } from '../constants';

export default function validImpressionsMode(log: ILogger, impressionsMode: string): SplitIO.ImpressionsMode {
  impressionsMode = impressionsMode.toUpperCase();
  if ([DEBUG, OPTIMIZED].indexOf(impressionsMode) === -1) {
    log.error(ERROR_INVALID_IMPRESSIONS_MODE, [[DEBUG, OPTIMIZED], OPTIMIZED]);
    impressionsMode = OPTIMIZED;
  }

  return impressionsMode as SplitIO.ImpressionsMode;
}
