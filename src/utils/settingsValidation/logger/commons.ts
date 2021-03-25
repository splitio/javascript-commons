
import { LogLevels, isLogLevelString } from '../../../logger';
import { LogLevel } from '../../../types';

/**
 * Returns the LogLevel for the given debugValue or undefined if it is invalid,
 * i.e., if the debugValue is not a boolean or LogLevel string.
 *
 * @param debugValue debug value at config
 * @returns LogLevel of the given debugValue or undefined if the provided value is invalid
 */
export function getLogLevel(debugValue: unknown): LogLevel | undefined {
  if (typeof debugValue === 'boolean') {
    if (debugValue) {
      return LogLevels.DEBUG;
    } else {
      return LogLevels.NONE;
    }
  } else if (typeof debugValue === 'string' && isLogLevelString(debugValue)) {
    return debugValue;
  } else {
    return undefined;
  }
}
