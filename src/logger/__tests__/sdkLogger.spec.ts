import { createLoggerAPI } from '../sdkLogger';
import { Logger, LogLevels } from '../index';

test('LoggerAPI / methods and props', () => {
  // creates a LoggerAPI instance
  const logger = new Logger('category');
  const API = createLoggerAPI(logger);

  expect(typeof API).toBe('object'); // Our logger should expose an API object.

  expect(typeof API.setLogLevel).toBe('function'); // API object should have setLogLevel method.
  API.setLogLevel('INFO'); // @ts-ignore, accessing private prop
  expect(logger.options.logLevel).toBe('INFO'); // calling setLogLevel should update the log level.
  // @ts-ignore, passing wrong type
  API.setLogLevel('warn'); // @ts-ignore, accessing private prop
  expect(logger.options.logLevel).toBe('INFO'); // calling setLogLevel with an invalid value should not update the log level.

  expect(typeof API.enable).toBe('function'); // API object should have enable method.
  API.enable(); // @ts-ignore, accessing private prop
  expect(logger.options.logLevel).toBe('DEBUG'); // calling enable should update logger log level to DEBUG.

  expect(typeof API.disable).toBe('function'); // API object should have disable method.
  API.disable(); // @ts-ignore, accessing private prop
  expect(logger.options.logLevel).toBe('NONE'); // calling disable should update logger log level to NONE.

  expect(API.LogLevel).toEqual(LogLevels); // API object should have LogLevel prop including all available levels.

});
