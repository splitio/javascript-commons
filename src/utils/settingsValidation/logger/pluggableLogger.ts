import { Logger, LogLevels } from '../../../logger';
import { ILogger } from '../../../logger/types';
import SplitIO from '../../../../types/splitio';
import { getLogLevel, isLogger } from './commons';

function isILogger(log: any): log is ILogger {
  return isLogger(log) && typeof (log as any).setLogLevel === 'function';
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
    if (isILogger(debug)) {
      if (isLogger(logger)) debug.setLogger(logger);
      return debug;
    }
    logLevel = getLogLevel(settings.debug);
  }

  const log = new Logger({ logLevel: logLevel || initialLogLevel });
  if (isLogger(logger)) log.setLogger(logger);

  // @ts-ignore // `debug` value is invalid if logLevel is undefined at this point
  if (!logLevel) log.logger.error(log._log(LogLevels.ERROR, 'Invalid `debug` value at config. Logs will be disabled.'));

  return log;
}
