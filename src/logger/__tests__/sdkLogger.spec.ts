import { createLoggerAPI } from '../sdkLogger';
import { Logger, LogLevels } from '../index';

test('createLoggerAPI / methods and props', () => {
  const logger = new Logger('category', {});

  expect(typeof createLoggerAPI).toBe('function'); // Importing the module should return a function.

  const API = createLoggerAPI(logger);

  expect(typeof API).toBe('object'); // Our logger should expose an API object.

  expect(typeof API.setLogLevel).toBe('function'); // API object should have setLogLevel method.
  API.setLogLevel('INFO'); // @ts-ignore
  expect(logger.options.logLevel).toBe('INFO'); // calling setLogLevel should update the log level.
  // @ts-ignore
  API.setLogLevel('warn'); // @ts-ignore
  expect(logger.options.logLevel).toBe('INFO'); // calling setLogLevel with an invalid value should not update the log level.

  expect(typeof API.enable).toBe('function'); // API object should have enable method.
  API.enable(); // @ts-ignore
  expect(logger.options.logLevel).toBe('DEBUG'); // calling enable should update logger log level to DEBUG.

  expect(typeof API.disable).toBe('function'); // API object should have disable method.
  API.disable(); // @ts-ignore
  expect(logger.options.logLevel).toBe('NONE'); // calling disable should update logger log level to NONE.

  expect(API.LogLevel).toEqual(LogLevels); // API object should have LogLevel prop including all available levels.

});
