import { loggerMock, getLoggerLogLevel } from '../../../../logger/__tests__/sdkLogger.mock';

import { validateLogger as pluggableValidateLogger } from '../pluggableLogger';
import { validateLogger as builtinValidateLogger } from '../builtinLogger';

const customLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const testTargets = [
  [pluggableValidateLogger],
  [builtinValidateLogger]
];

describe('logger validators', () => {

  const consoleLogSpy = jest.spyOn(global.console, 'log');
  afterEach(() => {
    consoleLogSpy.mockClear();
    customLogger.debug.mockClear();
    customLogger.info.mockClear();
    customLogger.warn.mockClear();
    customLogger.error.mockClear();
  });

  test.each(testTargets)('returns a NONE logger if `debug` property is not defined or false', (validateLogger) => { // @ts-ignore
    expect(getLoggerLogLevel(validateLogger({}))).toBe('NONE');
    expect(getLoggerLogLevel(validateLogger({ debug: undefined }))).toBe('NONE');
    expect(getLoggerLogLevel(validateLogger({ debug: false }))).toBe('NONE');

    expect(consoleLogSpy).not.toBeCalled();
  });

  test.each(testTargets)('returns a NONE logger if `debug` property is invalid and logs the error', (validateLogger) => {
    expect(getLoggerLogLevel(validateLogger({ debug: null }))).toBe('NONE');
    expect(getLoggerLogLevel(validateLogger({ debug: 10, logger: undefined }))).toBe('NONE'); // @ts-expect-error invalid `logger`, ignored because it's falsy
    expect(getLoggerLogLevel(validateLogger({ debug: {}, logger: false }))).toBe('NONE');

    if (validateLogger === builtinValidateLogger) {
      // for builtinValidateLogger, a logger cannot be passed as `debug` property
      expect(getLoggerLogLevel(validateLogger({ debug: loggerMock }))).toBe('NONE');
      expect(consoleLogSpy).toBeCalledTimes(4);
    } else {
      expect(consoleLogSpy).toBeCalledTimes(3);
    }
  });

  test.each(testTargets)('returns a logger with the provided log level if `debug` property is true or a string log level', (validateLogger) => {
    expect(getLoggerLogLevel(validateLogger({ debug: true }))).toBe('DEBUG');
    expect(getLoggerLogLevel(validateLogger({ debug: 'DEBUG' }))).toBe('DEBUG');
    expect(getLoggerLogLevel(validateLogger({ debug: 'INFO' }))).toBe('INFO');
    expect(getLoggerLogLevel(validateLogger({ debug: 'WARN' }))).toBe('WARN');
    expect(getLoggerLogLevel(validateLogger({ debug: 'ERROR' }))).toBe('ERROR');
    expect(getLoggerLogLevel(validateLogger({ debug: 'NONE' }))).toBe('NONE');

    expect(consoleLogSpy).not.toBeCalled();
  });

  test('pluggable logger validators / returns the provided logger at `debug` property if it is valid', () => {
    expect(pluggableValidateLogger({ debug: loggerMock })).toBe(loggerMock);

    expect(consoleLogSpy).not.toBeCalled();
  });

  test.each(testTargets)('uses the provided custom logger if it is valid', (validateLogger) => {
    const logger = validateLogger({ debug: true, logger: customLogger });

    logger.debug('test debug');
    expect(customLogger.debug).toBeCalledWith('[DEBUG] splitio => test debug');

    logger.info('test info');
    expect(customLogger.info).toBeCalledWith('[INFO]  splitio => test info');

    logger.warn('test warn');
    expect(customLogger.warn).toBeCalledWith('[WARN]  splitio => test warn');

    logger.error('test error');
    expect(customLogger.error).toBeCalledWith('[ERROR] splitio => test error');

    expect(consoleLogSpy).not.toBeCalled();
  });

  test.each(testTargets)('uses the default console.log method if the provided custom logger is not valid', (validateLogger) => {
    // @ts-expect-error `logger` property is not valid
    const logger = validateLogger({ debug: true, logger: {} });
    expect(consoleLogSpy).toBeCalledWith('[ERROR] splitio => Invalid `logger` instance. It must be an object with `debug`, `info`, `warn` and `error` methods. Defaulting to `console.log`');

    logger.debug('test debug');
    expect(consoleLogSpy).toBeCalledWith('[DEBUG] splitio => test debug');

    logger.info('test info');
    expect(consoleLogSpy).toBeCalledWith('[INFO]  splitio => test info');

    logger.warn('test warn');
    expect(consoleLogSpy).toBeCalledWith('[WARN]  splitio => test warn');

    logger.error('test error');
    expect(consoleLogSpy).toBeCalledWith('[ERROR] splitio => test error');

    expect(consoleLogSpy).toBeCalledTimes(5);
  });

  test.each(testTargets)('uses the default console.log method if the provided custom logger throws an error', (validateLogger) => {
    const customLoggerWithErrors = {
      debug: jest.fn(() => { throw new Error('debug error'); }),
      info: jest.fn(() => { throw new Error('info error'); }),
      warn: jest.fn(() => { throw new Error('warn error'); }),
      error: jest.fn(() => { throw new Error('error error'); })
    };

    const logger = validateLogger({ debug: true, logger: customLoggerWithErrors });

    logger.debug('test debug');
    expect(customLoggerWithErrors.debug).toBeCalledWith('[DEBUG] splitio => test debug');
    expect(consoleLogSpy).toBeCalledWith('[DEBUG] splitio => test debug');

    logger.info('test info');
    expect(customLoggerWithErrors.info).toBeCalledWith('[INFO]  splitio => test info');
    expect(consoleLogSpy).toBeCalledWith('[INFO]  splitio => test info');

    logger.warn('test warn');
    expect(customLoggerWithErrors.warn).toBeCalledWith('[WARN]  splitio => test warn');
    expect(consoleLogSpy).toBeCalledWith('[WARN]  splitio => test warn');

    logger.error('test error');
    expect(customLoggerWithErrors.error).toBeCalledWith('[ERROR] splitio => test error');
    expect(consoleLogSpy).toBeCalledWith('[ERROR] splitio => test error');

    expect(consoleLogSpy).toBeCalledTimes(4);
  });

});
