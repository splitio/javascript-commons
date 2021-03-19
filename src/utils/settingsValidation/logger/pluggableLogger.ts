import { Logger, LogLevels } from '../../../logger';
import { ILogger } from '../../../logger/types';

function isLogger(log: any): log is ILogger {
  return log && typeof log.debug === 'function' && typeof log.info === 'function' && typeof log.warn === 'function' && typeof log.error === 'function' && typeof log.setLogLevel === 'function';
}

/**
 * Validates the `debug` (logger) property at config.
 *
 * @param settings user config object
 * @returns the provided logger at `settings.debug` or a new one with NONE log level if the provided one is invalid
 */
export function validateLogger(settings: { debug: unknown }): ILogger {
  const { debug } = settings;
  const log = new Logger();

  // @TODO support boolean and string values?
  if (!debug) return log;

  if (isLogger(debug)) return debug;

  // logs error for consistency with builtin logger validator
  log._log(LogLevels.ERROR, 'The provided `debug` value at config is invalid.');

  return log;
}
