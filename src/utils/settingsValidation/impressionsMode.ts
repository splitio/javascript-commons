import { ERROR_INVALID_CONFIG_PARAM } from '../../logger/constants';
import { ILogger } from '../../types';
import { ImpressionsMode } from '../../types';
import { DEBUG, OPTIMIZED } from '../constants';
import { stringToUpperCase } from '../lang';

export function validImpressionsMode(log: ILogger, impressionsMode: any): ImpressionsMode {
  impressionsMode = stringToUpperCase(impressionsMode);

  if ([DEBUG, OPTIMIZED].indexOf(impressionsMode) > -1) return impressionsMode;

  log.error(ERROR_INVALID_CONFIG_PARAM, ['impressionsMode', [DEBUG, OPTIMIZED], OPTIMIZED]);
  return OPTIMIZED;
}
