import { isLogLevelString, Logger, LogLevels } from '../../../logger';
import { ILogger } from '../../../logger/types';
import { LogLevel } from '../../../types';
import { isLocalStorageAvailable } from '../../env/isLocalStorageAvailable';
import { isNode } from '../../env/isNode';

// @TODO when integrating with other packages, find the best way to handle initial state per environment
const LS_KEY = 'splitio_debug';
const ENV_VAR_KEY = 'SPLITIO_DEBUG';

/**
 * Logger initial debug level, that is disabled ('NONE') by default.
 * Acceptable values are: 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'.
 * Other acceptable values are 'on', 'enable' and 'enabled', which are equivalent to 'DEBUG'.
 * Any other string value is equivalent to disable.
 */
const initialState = String(
  // eslint-disable-next-line no-undef
  isNode ? process.env[ENV_VAR_KEY] : isLocalStorageAvailable() ? localStorage.getItem(LS_KEY) : ''
);


// By default it starts disabled.
let initialLogLevel = LogLevels.NONE;

// Kept to avoid a breaking change ('on', 'enable' and 'enabled' are equivalent)
if (/^(enabled?|on)/i.test(initialState)) {
  initialLogLevel = LogLevels.DEBUG;
} else if (isLogLevelString(initialState)) {
  initialLogLevel = initialState;
}

// returns the LogLevel for the given debugValue or undefined if it is invalid.
// debugValue must be a boolean or LogLevel string.
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

/**
 * Validates the `debug` property at config and use it to set the log level.
 *
 * @param settings user config object
 * @returns a logger instance with the log level at `settings.debug`. If `settings.debug` is invalid or not provided, `initialLogLevel` is used.
 */
export function validateLogger(settings: { debug: unknown} ): ILogger {

  const settingLogLevel = settings.debug ? getLogLevel(settings.debug) : initialLogLevel;

  const log = new Logger('splitio', { logLevel: settingLogLevel || initialLogLevel });

  // logs error if the provided settings debug value is invalid
  if (!settingLogLevel) log.error('Invalid Log Level - No changes to the logs will be applied.');

  return log;
}


