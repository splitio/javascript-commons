import { LogLevels, isLogLevelString } from './index';
import { ILoggerAPI } from '../types';
import { ILogger } from './types';
import { ERROR_LOGLEVEL_INVALID } from './constants';

/**
 * The public Logger utility API exposed via SplitFactory, used to update the log level.
 *
 * @param log the factory logger instance to handle
 */
export function createLoggerAPI(log: ILogger): ILoggerAPI {

  function setLogLevel(logLevel: string) {
    if (isLogLevelString(logLevel)) {
      log.setLogLevel(logLevel);
    } else {
      log.error(ERROR_LOGLEVEL_INVALID);
    }
  }

  return {
    /**
     * Enables all the logs.
     */
    enable() {
      setLogLevel(LogLevels.DEBUG);
    },
    /**
     * Sets a custom log Level for the SDK.
     * @param {string} logLevel - Custom LogLevel value.
     */
    setLogLevel,
    /**
     * Disables all the log levels.
     */
    disable() {
      // Disabling is equal logLevel none
      setLogLevel(LogLevels.NONE);
    },
    /**
     * Exposed for usage with setLogLevel
     */
    LogLevel: LogLevels
  };

}
