import { Logger, LogLevels } from '../../../logger';
import { ILogger } from '../../../logger/types';
import SplitIO from '../../../../types/splitio';
import { getLogLevel } from './commons';

function isLogger(log: any): log is ILogger {
  return log !== null && typeof log === 'object' && typeof log.debug === 'function' && typeof log.info === 'function' && typeof log.warn === 'function' && typeof log.error === 'function' && typeof log.setLogLevel === 'function';
}

// By default it starts disabled.
let initialLogLevel = LogLevels.NONE;

/**
 * Validates the `debug` property at config and use it to set the logger.
 *
 * @param settings - user config object, with an optional `debug` property of type boolean, string log level or a Logger object.
 * @returns a logger instance, that might be: the provided logger at `settings.debug`, or one with the given `debug` log level,
 * or one with NONE log level if `debug` is not defined or invalid.
 */
export function validateLogger(settings: { debug: unknown, logger?: unknown }): ILogger {
  const { debug, logger } = settings;
  let logLevel: SplitIO.LogLevel | undefined = initialLogLevel;

  if (debug !== undefined) {
    if (isLogger(debug)) {
      if (typeof logger === 'function') debug.setLogger(logger as (formattedMsg: string, level: SplitIO.LogLevel, msg: string) => void);
      return debug;
    }
    logLevel = getLogLevel(settings.debug);
  }

  const log = new Logger({ logLevel: logLevel || initialLogLevel });
  if (typeof logger === 'function') log.setLogger(logger as (formattedMsg: string, level: SplitIO.LogLevel, msg: string) => void);

  // @ts-ignore // `debug` value is invalid if logLevel is undefined at this point
  if (!logLevel) log._log(LogLevels.ERROR, 'Invalid `debug` value at config. Logs will be disabled.');

  return log;
}
