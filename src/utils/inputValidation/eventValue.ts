import { isFiniteNumber } from '../lang';
import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('');

export function validateEventValue(maybeValue: any, method: string): number | false {
  if (isFiniteNumber(maybeValue) || maybeValue == undefined) // eslint-disable-line eqeqeq
    return maybeValue;

  log.error(`${method}: value must be a finite number.`);
  return false;
}
