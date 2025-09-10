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
    expect(getLoggerLogLevel(validateLogger({ debug: 10 }))).toBe('NONE');
    expect(getLoggerLogLevel(validateLogger({ debug: {}, logger: customLogger }))).toBe('NONE');

    if (validateLogger === builtinValidateLogger) {
      // for builtinValidateLogger, a logger cannot be passed as `debug` property
      expect(getLoggerLogLevel(validateLogger({ debug: loggerMock }))).toBe('NONE');
      expect(consoleLogSpy).toBeCalledTimes(3);
    } else {
      expect(consoleLogSpy).toBeCalledTimes(2);
    }
    expect(customLogger.error).toBeCalledTimes(1);
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

});
