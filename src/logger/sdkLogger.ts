/**
 * This file defines the logger interface and default options for the SDKs, not necessarily for the Logger as it's own.
 */
import { ILoggerOptions } from './types';
import { Logger, LogLevels, setLogLevel, isLogLevelString } from '.';
import { isLocalStorageAvailable } from '../utils/env/isLocalStorageAvailable';
import { isNode } from '../utils/env/isNode';
import { merge } from '../utils/lang';
import { ILoggerAPI } from '../types';
import { codes } from './codes';

// @TODO when integrating with other packages, find the best way to update LoggerOption defaults per package (node, evaluator, etc.)
const defaultOptions: ILoggerOptions = {
  showLevel: true,
  displayAllErrors: false
};

// @TODO when integrating with other packages, find the best way to handle initial state per package/environment
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

// we expose the logger instance creator
export const logFactory = (namespace: string, options = {}) => new Logger(namespace, merge(options, defaultOptions), codes);

const ownLog = logFactory('splitio-utils:logger');

/**
 * The public Logger utility API exposed via SplitFactory.
 */
export const API: ILoggerAPI = {
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
  setLogLevel(logLevel: string) {
    if (isLogLevelString(logLevel)) {
      setLogLevel(logLevel);
    } else {
      ownLog.e('Invalid Log Level - No changes to the logs will be applied.');
    }
  },
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

// Kept to avoid a breaking change ('on', 'enable' and 'enabled' are equivalent)
if (/^(enabled?|on)/i.test(initialState)) {
  API.enable();
} else if (isLogLevelString(initialState)) {
  API.setLogLevel(initialState);
} else {
  // By default it starts disabled.
  API.disable();
}
