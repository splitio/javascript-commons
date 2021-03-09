import { createLoggerAPI } from '../sdkLogger';
import { Logger, LogLevels } from '../index';

test('createLoggerAPI / methods and props', () => {
  const logger = new Logger('category', {});

  expect(typeof createLoggerAPI).toBe('function'); // Importing the module should return a function.

  const loggerAPI = createLoggerAPI(logger);

  expect(typeof loggerAPI).toBe('object'); // Our logger should expose an API object.

  expect(typeof loggerAPI.setLogLevel).toBe('function'); // API object should have setLogLevel method.
  loggerAPI.setLogLevel('INFO');
  expect(logger.options.logLevel).toBe('INFO'); // calling setLogLevel should update the log level.
  // @ts-ignore
  loggerAPI.setLogLevel('warn');
  expect(logger.options.logLevel).toBe('INFO'); // calling setLogLevel with an invalid value should not update the log level.

  expect(typeof loggerAPI.enable).toBe('function'); // API object should have enable method.
  loggerAPI.enable();
  expect(logger.options.logLevel).toBe('DEBUG'); // calling enable should update logger log level to DEBUG.

  expect(typeof loggerAPI.disable).toBe('function'); // API object should have disable method.
  loggerAPI.disable();
  expect(logger.options.logLevel).toBe('NONE'); // calling disable should update logger log level to NONE.

  expect(loggerAPI.LogLevel).toEqual(LogLevels); // API object should have LogLevel prop including all available levels.

});
