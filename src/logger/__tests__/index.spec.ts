import SplitIO from '../../../types/splitio';
import { Logger, LogLevels, isLogLevelString, _sprintf } from '../index';

// We'll set this only once. These are the constants we will use for
// comparing the LogLevel values.
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  NONE: 'NONE'
};

test('SPLIT LOGGER / isLogLevelString utility function', () => {
  expect(typeof isLogLevelString).toBe('function'); // isLogLevelString should be a function
  expect(isLogLevelString(LOG_LEVELS.DEBUG)).toBe(true); // Calling isLogLevelString should return true with a LOG_LEVELS value
  expect(isLogLevelString('ERROR')).toBe(true); // Calling isLogLevelString should return true with a string equal to some LOG_LEVELS value
  expect(isLogLevelString('INVALID LOG LEVEL')).toBe(false); // Calling isLogLevelString should return false with a string not equal to any LOG_LEVELS value

});

test('SPLIT LOGGER / LogLevels exposed mappings', () => {
  expect(LogLevels).toEqual(LOG_LEVELS); // Exposed log levels should contain the levels we want.

});

test('SPLIT LOGGER / Logger class shape', () => {
  expect(typeof Logger).toBe('function'); // Logger should be a class we can instantiate.

  const logger = new Logger({ prefix: 'test-category' });

  expect(typeof logger.debug).toBe('function'); // instance.debug should be a method.
  expect(typeof logger.info).toBe('function'); // instance.info should be a method.
  expect(typeof logger.warn).toBe('function'); // instance.warn should be a method.
  expect(typeof logger.error).toBe('function'); // instance.error should be a method.
  expect(typeof logger.setLogLevel).toBe('function'); // instance.setLogLevel should be a method.
});

const LOG_LEVELS_IN_ORDER: SplitIO.LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
/* Utility function to avoid repeating too much code */
function testLogLevels(levelToTest: SplitIO.LogLevel) {
  // Builds the expected message.
  const buildExpectedMessage = (lvl: string, category: string, msg: string, showLevel?: boolean) => {
    let res = '';
    if (showLevel) res += '[' + lvl + ']' + (lvl.length === 4 ? '  ' : ' ');
    res += category + ' => ';
    res += msg;
    return res;
  };

  // Spy console method based on level
  const levelToMethod: Record<Exclude<SplitIO.LogLevel, 'NONE'>, keyof typeof console> = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  };

  const consoleMethodSpy = levelToTest === 'NONE'
    ? jest.spyOn(global.console, 'log').mockImplementation(() => {})
    : jest.spyOn(global.console, levelToMethod[levelToTest] as any);

  // Runs the suite with the given value for showLevel option.
  const runTests = (showLevel?: boolean, useCodes?: boolean) => {
    let logLevelLogsCounter = 0;
    let testForNoLog = false;
    const logMethod = levelToTest.toLowerCase();
    const logCategory = `test-category-${logMethod}`;
    const instance = new Logger({ prefix: logCategory, showLevel },
      useCodes ? new Map([[1, 'Test log for level %s with showLevel: %s %s']]) : undefined);

    LOG_LEVELS_IN_ORDER.forEach((logLevel, i) => {
      const logMsg = `Test log for level ${levelToTest} with showLevel: ${showLevel} ${logLevelLogsCounter}`;
      const expectedMessage = buildExpectedMessage(levelToTest, logCategory, logMsg, showLevel);

      // Set the logLevel for this iteration.
      instance.setLogLevel(LogLevels[logLevel]);
      // Call the method
      // @ts-ignore
      if (useCodes) instance[logMethod](1, [levelToTest, showLevel, logLevelLogsCounter]); // @ts-ignore
      else instance[logMethod](logMsg);
      // Assert if console method was called.
      const actualMessage = consoleMethodSpy.mock.calls[consoleMethodSpy.mock.calls.length - 1][0];
      if (testForNoLog) {
        expect(actualMessage).not.toBe(expectedMessage);
      } else {
        expect(actualMessage).toBe(expectedMessage);
      }

      if (LOG_LEVELS_IN_ORDER.indexOf(levelToTest) <= i) {
        testForNoLog = true;
      }
      logLevelLogsCounter++;
    });
  };

  // Show logLevel
  runTests(true);
  // Hide logLevel
  runTests(false);
  // Hide logLevel and use message codes
  runTests(false, true);

  // Restore spied object.
  consoleMethodSpy.mockRestore();

}

test('SPLIT LOGGER / Logger class public methods behavior - instance.debug', () => {
  testLogLevels(LogLevels.DEBUG);

});

test('SPLIT LOGGER / Logger class public methods behavior - instance.info', () => {
  testLogLevels(LogLevels.INFO);

});

test('SPLIT LOGGER / Logger class public methods behavior - instance.warn', () => {
  testLogLevels(LogLevels.WARN);

});

test('SPLIT LOGGER / Logger class public methods behavior - instance.error', () => {
  testLogLevels(LogLevels.ERROR);

});

test('SPLIT LOGGER / _sprintf', () => {
  expect(_sprintf()).toBe('');
  expect(_sprintf(undefined, [/regex/, 'arg', 10, {}])).toBe('');

  expect(_sprintf('text')).toBe('text');
  expect(_sprintf('text', [])).toBe('text');
  expect(_sprintf('text', [/regex/, 'arg', 10, {}])).toBe('text');

  expect(_sprintf('text %s', [])).toBe('text undefined');
  expect(_sprintf('text %s', ['arg1'])).toBe('text arg1');
  expect(_sprintf('text %s', ['arg1', 'arg2'])).toBe('text arg1');
  expect(_sprintf('%s text %s', ['arg1', true, 'arg3'])).toBe('arg1 text true');

  // Stringify plain objects and arrays, but not other objects
  expect(_sprintf('Array: %s Object: %s Regex: %s Map: %s Error: %s', [[{a: '1'}], {a: '1'}, /aaa/, new Map([['a', '1']]), new Error('my-error')]))
    .toBe('Array: [{"a":"1"}] Object: {"a":"1"} Regex: /aaa/ Map: [object Map] Error: Error: my-error');

  // Handle JSON.stringify exceptions
  const circular: any = { b: null }; circular.b = circular;
  expect(_sprintf('%s', [circular])).toBe('[object Object]');
});

test('SPLIT LOGGER / logs via correct console method for each level', () => {
  const spies = {
    debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
    info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    log: jest.spyOn(console, 'log').mockImplementation(() => {})
  };

  const logger = new Logger({ prefix: 'verify-level' });

  logger.setLogLevel(LogLevels.DEBUG);

  logger.debug('debug msg');
  expect(spies.debug).toHaveBeenCalledWith(expect.stringContaining('debug msg'));

  logger.info('info msg');
  expect(spies.info).toHaveBeenCalledWith(expect.stringContaining('info msg'));

  logger.warn('warn msg');
  expect(spies.warn).toHaveBeenCalledWith(expect.stringContaining('warn msg'));

  logger.error('error msg');
  expect(spies.error).toHaveBeenCalledWith(expect.stringContaining('error msg'));

  logger.setLogLevel(LogLevels.NONE);

  logger.debug('should not log');
  logger.info('should not log');
  logger.warn('should not log');
  logger.error('should not log');

  expect(spies.debug).toHaveBeenCalledTimes(1);
  expect(spies.info).toHaveBeenCalledTimes(1);
  expect(spies.warn).toHaveBeenCalledTimes(1);
  expect(spies.error).toHaveBeenCalledTimes(1);
  expect(spies.log).not.toHaveBeenCalled();
});
