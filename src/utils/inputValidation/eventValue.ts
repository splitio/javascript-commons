import { ILogger } from '../../logger/types';
import { isFiniteNumber } from '../lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

export function validateEventValue(log: ILogger, maybeValue: any, method: string): number | false {
  if (isFiniteNumber(maybeValue) || maybeValue == undefined) // eslint-disable-line eqeqeq
    return maybeValue;

  log.e(`${method}: value must be a finite number.`);
  return false;
}
