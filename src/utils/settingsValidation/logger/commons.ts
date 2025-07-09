
import { LogLevels, isLogLevelString } from '../../../logger';
import SplitIO from '../../../../types/splitio';

/**
 * Returns the LogLevel for the given debugValue or undefined if it is invalid,
 * i.e., if the debugValue is not a boolean or LogLevel string.
 *
 * @param debugValue - debug value at config
 * @returns LogLevel of the given debugValue or undefined if the provided value is invalid
 */
export function getLogLevel(debugValue: unknown): SplitIO.LogLevel | undefined {
  return typeof debugValue === 'boolean' ?
    debugValue ?
      LogLevels.DEBUG :
      LogLevels.NONE :
    typeof debugValue === 'string' && isLogLevelString(debugValue) ?
      debugValue :
      undefined;
}
