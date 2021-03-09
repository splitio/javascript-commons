import { LogLevel } from '../../types';
import { Logger, LogLevels, isLogLevelString } from '../index';

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

  const logger = new Logger('test-category');

  expect(typeof logger.debug).toBe('function'); // instance.debug should be a method.
  expect(typeof logger.info).toBe('function'); // instance.info should be a method.
  expect(typeof logger.warn).toBe('function'); // instance.warn should be a method.
  expect(typeof logger.error).toBe('function'); // instance.error should be a method.
  expect(typeof logger.options.logLevel).toBe('string'); // instance.options.logLevel should be a string.
  expect(typeof logger.options.showLevel).toBe('boolean'); // instance.options.showLevel should be a boolean.

});

const LOG_LEVELS_IN_ORDER = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
/* Utility function to avoid repeating too much code */
function testLogLevels(levelToTest: LogLevel) {
  // Builds the expected message.
  const buildExpectedMessage = (lvl: string, category: string, msg: string, showLevel?: boolean) => {
    let res = '';
    if (showLevel) res += '[' + lvl + ']' + (lvl.length === 4 ? '  ' : ' ');
    res += category + ' => ';
    res += msg;
    return res;
  };

  // Spy console.log
  const consoleLogSpy = jest.spyOn(global.console, 'log');

  // Runs the suite with the given value for showLevel option.
  const runTests = (showLevel?: boolean) => {
    let logLevelLogsCounter = 0;
    let testForNoLog = false;
    const logMethod = levelToTest.toLowerCase();
    const logCategory = `test-category-${logMethod}`;
    const instance = new Logger(logCategory, { showLevel });

    LOG_LEVELS_IN_ORDER.forEach((logLevel, i) => {
      const logMsg = `Test log for level ${levelToTest} with showLevel: ${showLevel} ${logLevelLogsCounter}`;
      const expectedMessage = buildExpectedMessage(levelToTest, logCategory, logMsg, showLevel);

      // Set the logLevel for this iteration.
      instance.options.logLevel = LogLevels[logLevel];
      // Call the method
      // @ts-ignore
      instance[logMethod](logMsg);
      // Assert if console.log was called.
      const actualMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
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

  // Restore spied object.
  consoleLogSpy.mockRestore();

}

test('SPLIT LOGGER / Logger class public methods behaviour - instance.debug', () => {
  testLogLevels(LogLevels.DEBUG);

});

test('SPLIT LOGGER / Logger class public methods behaviour - instance.info', () => {
  testLogLevels(LogLevels.INFO);

});

test('SPLIT LOGGER / Logger class public methods behaviour - instance.warn', () => {
  testLogLevels(LogLevels.WARN);

});

test('SPLIT LOGGER / Logger class public methods behaviour - instance.error', () => {
  testLogLevels(LogLevels.ERROR);

});
