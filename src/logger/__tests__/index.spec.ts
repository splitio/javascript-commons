import { Logger, LogLevels, setLogLevel, isLogLevelString } from '../index';
import { codes } from '../codes';
import { LogLevel } from '../../types';

// We'll set this only once. These are the constants we will use for
// comparing the LogLevel values.
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  NONE: 'NONE'
};

test('SPLIT LOGGER / setLogLevel utility function', () => {
  expect(typeof setLogLevel).toBe('function'); // setLogLevel should be a function
  expect(setLogLevel).not.toThrow(); // Calling setLogLevel should not throw an error.

});

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

  const logger = new Logger('test-category', {}, codes);

  expect(typeof logger.d).toBe('function'); // instance.d should be a method.
  expect(typeof logger.i).toBe('function'); // instance.i should be a method.
  expect(typeof logger.w).toBe('function'); // instance.w should be a method.
  expect(typeof logger.e).toBe('function'); // instance.e should be a method.

});

const LOG_LEVELS_IN_ORDER: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
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
  const runTests = (showLevel?: boolean, displayAllErrors?: boolean) => {
    let logLevelLogsCounter = 0;
    let testForNoLog = false;
    const logMethod = levelToTest.toLowerCase().charAt(0);
    const logCategory = `test-category-${logMethod}${displayAllErrors ? 'displayAllErrors' : ''}`;
    const instance = new Logger(logCategory, {
      showLevel, displayAllErrors
    }, codes);

    LOG_LEVELS_IN_ORDER.forEach((logLevel: LogLevel, i) => {
      const logMsg = `Test log for level ${levelToTest} (${displayAllErrors ? 'But all errors are configured to display' : 'Errors not forced to display'}) with showLevel: ${showLevel} ${logLevelLogsCounter}`;
      const expectedMessage = buildExpectedMessage(levelToTest, logCategory, logMsg, showLevel);

      // Log error should always be visible.
      if (logMethod === LOG_LEVELS.ERROR.toLowerCase().charAt(0) && displayAllErrors) testForNoLog = false;

      // Set the logLevel for this iteration.
      setLogLevel(LogLevels[logLevel]);
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
  runTests(true, true);
  // Hide logLevel
  runTests(false);
  runTests(false, true);

  // Restore spied object.
  consoleLogSpy.mockRestore();

}

test('SPLIT LOGGER / Logger class public methods behaviour - instance.d', () => {
  testLogLevels(LogLevels.DEBUG);

});

test('SPLIT LOGGER / Logger class public methods behaviour - instance.i', () => {
  testLogLevels(LogLevels.INFO);

});

test('SPLIT LOGGER / Logger class public methods behaviour - instance.w', () => {
  testLogLevels(LogLevels.WARN);

});

test('SPLIT LOGGER / Logger class public methods behaviour - instance.e', () => {
  testLogLevels(LogLevels.ERROR);

});
