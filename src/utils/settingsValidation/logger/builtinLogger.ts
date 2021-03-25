import { isLogLevelString, Logger, LogLevels } from '../../../logger';
import { ILogger } from '../../../logger/types';
import { isLocalStorageAvailable } from '../../env/isLocalStorageAvailable';
import { isNode } from '../../env/isNode';
import { codesDebug } from '../../../logger/messages/debug';
import { _Map } from '../../lang/maps';
import { getLogLevel } from './commons';
import { LogLevel } from '../../../types';

const allCodes = new _Map(codesDebug);

// @TODO set default debug setting instead of initialLogLevel when integrating in JS and Node packages
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

/**
 * Validates the `debug` property at config and use it to set the log level.
 *
 * @param settings user config object, with an optional `debug` property of type boolean or string log level.
 * @returns a logger instance with the log level at `settings.debug`. If `settings.debug` is invalid or not provided, `initialLogLevel` is used.
 */
export function validateLogger(settings: { debug: unknown }): ILogger {
  const { debug } = settings;

  const logLevel: LogLevel | undefined = debug !== undefined ? getLogLevel(debug) : initialLogLevel;

  const log = new Logger({ logLevel: logLevel || initialLogLevel }, allCodes);

  // @ts-ignore // if logLevel is undefined at this point, it means that settings `debug` value is invalid
  if (!logLevel) log._log(LogLevels.ERROR, 'Invalid Log Level - No changes to the logs will be applied.');

  return log;
}
