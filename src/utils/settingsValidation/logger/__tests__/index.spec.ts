import { ILogger } from '../../../../logger/types';
import { LogLevel } from '../../../../types';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

import { validateLogger as pluggableValidateLogger } from '../pluggableLogger';
import { validateLogger as builtinValidateLogger } from '../builtinLogger';

const testTargets = [
  [pluggableValidateLogger],
  [builtinValidateLogger]
];

function getLogLevel(logger?: ILogger): LogLevel | undefined { // @ts-ignore
  if (logger) return logger.options.logLevel;
}

describe('logger validators', () => {

  const consoleLogSpy = jest.spyOn(global.console, 'log');
  afterEach(() => { consoleLogSpy.mockClear(); });

  test.each(testTargets)('returns a NONE logger if `debug` property is not defined or false', (validateLogger) => { // @ts-ignore
    expect(getLogLevel(validateLogger({}))).toBe('NONE');
    expect(getLogLevel(validateLogger({ debug: undefined }))).toBe('NONE');
    expect(getLogLevel(validateLogger({ debug: false }))).toBe('NONE');

    expect(consoleLogSpy).not.toBeCalled();
  });

  test.each(testTargets)('returns a NONE logger if `debug` property is invalid and logs the error', (validateLogger) => {
    expect(getLogLevel(validateLogger({ debug: null }))).toBe('NONE');
    expect(getLogLevel(validateLogger({ debug: 10 }))).toBe('NONE');
    expect(getLogLevel(validateLogger({ debug: {} }))).toBe('NONE');

    expect(consoleLogSpy).toBeCalledTimes(3);
  });

  test.each(testTargets)('returns a logger with the provided log level if `debug` property is true or a string log level', (validateLogger) => {
    expect(getLogLevel(validateLogger({ debug: true }))).toBe('DEBUG');
    expect(getLogLevel(validateLogger({ debug: 'DEBUG' }))).toBe('DEBUG');
    expect(getLogLevel(validateLogger({ debug: 'INFO' }))).toBe('INFO');
    expect(getLogLevel(validateLogger({ debug: 'WARN' }))).toBe('WARN');
    expect(getLogLevel(validateLogger({ debug: 'ERROR' }))).toBe('ERROR');
    expect(getLogLevel(validateLogger({ debug: 'NONE' }))).toBe('NONE');

    expect(consoleLogSpy).not.toBeCalled();
  });

  test('pluggable logger validators / returns the provided logger at `debug` property if it is valid', () => {
    expect(pluggableValidateLogger({ debug: loggerMock })).toBe(loggerMock);

    expect(consoleLogSpy).not.toBeCalled();
  });

  test('builtin logger validators / returns a NONE logger if `debug` property is invalid and logs the error', () => {
    expect(getLogLevel(builtinValidateLogger({ debug: loggerMock }))).toBe('NONE');

    expect(consoleLogSpy).toBeCalledTimes(1);
  });

});
