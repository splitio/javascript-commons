import { ILogger } from '../../../logger/types';

const noopLogger: ILogger = {
  options: { logLevel: 'NONE' },
  debug() { },
  info() { },
  warn() { },
  error() { }
};

function isLogger(log: unknown): log is ILogger {
  // @ts-ignore
  return log && typeof log.debug === 'function' && typeof log.info === 'function' && typeof log.warn === 'function' && typeof log.error === 'function';
}

/**
 * Validates the `log` (logger) property at config.
 *
 * @param settings user config object
 * @returns the provided logger or a no-op logger if no one is provided
 * @throws throws an error if a logger was provided but is invalid
 */
export function validateLogger(settings: { debug: unknown }): ILogger {
  const { debug } = settings;

  if (!debug) return noopLogger;

  if (isLogger(debug)) return debug;

  throw new Error('The provided `debug` value at config is not valid');
}
