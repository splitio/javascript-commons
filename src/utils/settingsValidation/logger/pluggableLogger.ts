import { Logger, LogLevels } from '../../../logger';
import { ILogger } from '../../../logger/types';
import { LogLevel } from '../../../types';
import { getLogLevel } from './commons';

function isLogger(log: any): log is ILogger {
  return log && typeof log.debug === 'function' && typeof log.info === 'function' && typeof log.warn === 'function' && typeof log.error === 'function' && typeof log.setLogLevel === 'function';
}

// By default it starts disabled.
let initialLogLevel = LogLevels.NONE;

/**
 * Validates the `debug` property at config and use it to set the logger.
 *
 * @param settings user config object, with an optional `debug` property of type boolean, string log level or a Logger object.
 * @returns a logger instance, that might be: the provided logger at `settings.debug`, or one with the given `debug` log level,
 * or one with NONE log level if `debug` is not defined or invalid.
 */
export function validateLogger(settings: { debug: unknown }): ILogger {
  const { debug } = settings;
  let logLevel: LogLevel | undefined = initialLogLevel;

  if (debug !== undefined) {
    if (isLogger(debug)) return debug;
    logLevel = getLogLevel(settings.debug);
  }

  const log = new Logger({ logLevel: logLevel || initialLogLevel });

  // @ts-ignore // `debug` value is invalid if logLevel is undefined at this point
  if (!logLevel) log._log(LogLevels.ERROR, 'Invalid `debug` value at config. Logs will be disabled.');

  return log;
}
