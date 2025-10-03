import { createLoggerAPI } from '../sdkLogger';
import { Logger, LogLevels } from '../index';
import { getLoggerLogLevel, getCustomLogger } from './sdkLogger.mock';

test('LoggerAPI / methods and props', () => {
  // creates a LoggerAPI instance
  const logger = new Logger();
  const API = createLoggerAPI(logger);

  expect(typeof API).toBe('object'); // Our logger should expose an API object.

  expect(typeof API.setLogLevel).toBe('function'); // API object should have setLogLevel method.
  API.setLogLevel('INFO');
  expect(getLoggerLogLevel(logger)).toBe('INFO'); // calling setLogLevel should update the log level.
  // @ts-ignore, passing wrong type
  API.setLogLevel('warn');
  expect(getLoggerLogLevel(logger)).toBe('INFO'); // calling setLogLevel with an invalid value should not update the log level.

  expect(typeof API.enable).toBe('function'); // API object should have enable method.
  API.enable();
  expect(getLoggerLogLevel(logger)).toBe('DEBUG'); // calling enable should update logger log level to DEBUG.

  expect(typeof API.disable).toBe('function'); // API object should have disable method.
  API.disable();
  expect(getLoggerLogLevel(logger)).toBe('NONE'); // calling disable should update logger log level to NONE.

  expect(API.LogLevel).toEqual(LogLevels); // API object should have LogLevel prop including all available levels.

  // valid custom logger
  API.setLogger(console);
  expect(getCustomLogger(logger)).toBe(console);

  // unset custom logger
  API.setLogger(undefined);
  expect(getCustomLogger(logger)).toBeUndefined();

  // invalid custom logger
  // @ts-expect-error
  API.setLogger({});
  expect(getCustomLogger(logger)).toBeUndefined();
});
