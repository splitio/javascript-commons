import { ERROR_20 } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isFiniteNumber } from '../lang';

export function validateEventValue(log: ILogger, maybeValue: any, method: string): number | false {
  if (isFiniteNumber(maybeValue) || maybeValue == undefined) // eslint-disable-line eqeqeq
    return maybeValue;

  log.error(ERROR_20, [method]);
  return false;
}
