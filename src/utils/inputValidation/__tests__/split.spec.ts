import { ERROR_INVALID, ERROR_NULL, ERROR_EMPTY, WARN_TRIMMING } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateSplit } from '../split';

const invalidSplits = [
  { split: [], msg: ERROR_INVALID },
  { split: () => { }, msg: ERROR_INVALID },
  { split: Object.create({}), msg: ERROR_INVALID },
  { split: {}, msg: ERROR_INVALID },
  { split: true, msg: ERROR_INVALID },
  { split: false, msg: ERROR_INVALID },
  { split: 10, msg: ERROR_INVALID },
  { split: 0, msg: ERROR_INVALID },
  { split: NaN, msg: ERROR_INVALID },
  { split: Infinity, msg: ERROR_INVALID },
  { split: null, msg: ERROR_NULL },
  { split: undefined, msg: ERROR_NULL },
  { split: new Promise(res => res), msg: ERROR_INVALID },
  { split: Symbol('asd'), msg: ERROR_INVALID },
  { split: '', msg: ERROR_EMPTY }
];

const trimmableSplits = [
  '  splitName  ',
  'split_name2   \n  ',
  ' split_name3'
];

describe('INPUT VALIDATION for Split name', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the provided split name if it is a valid string without logging any errors', () => {
    expect(validateSplit(loggerMock, 'splitName', 'some_method_splitName')).toBe('splitName'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls[0]).not.toEqual('some_method_splitName'); // Should not log any errors.
    expect(validateSplit(loggerMock, 'split_name', 'some_method_splitName')).toBe('split_name'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls[0]).not.toEqual('some_method_splitName'); // Should not log any errors.
    expect(validateSplit(loggerMock, 'A_split-name_29', 'some_method_splitName')).toBe('A_split-name_29'); // It should return the provided string if it is valid.
    expect(loggerMock.error.mock.calls[0]).not.toEqual('some_method_splitName'); // Should not log any errors.

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('Should trim split name if it is a valid string with trimmable spaces and log a warning (if those are enabled)', () => {
    for (let i = 0; i < trimmableSplits.length; i++) {
      const trimmableSplit = trimmableSplits[i];
      expect(validateSplit(loggerMock, trimmableSplit, 'some_method_splitName')).toBe(trimmableSplit.trim()); // It should return the trimmed version of the split name received.
      expect(loggerMock.warn).toBeCalledWith(WARN_TRIMMING, ['some_method_splitName', 'split name', trimmableSplit]); // Should log a warning if those are enabled.

      loggerMock.warn.mockClear();
    }

    expect(loggerMock.error).not.toBeCalled(); // It should have not logged any errors.
  });

  test('Should return false and log error if split name is not a valid string', () => {
    for (let i = 0; i < invalidSplits.length; i++) {
      const invalidValue = invalidSplits[i]['split'];
      // @ts-ignore
      const expectedLog = invalidSplits[i]['msg'];

      expect(validateSplit(loggerMock, invalidValue, 'test_method')).toBe(false); // Invalid event types should always return false.
      expect(loggerMock.error).toBeCalledWith(expectedLog, ['test_method', 'split name']); // Should log the error for the invalid event type.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });
});
