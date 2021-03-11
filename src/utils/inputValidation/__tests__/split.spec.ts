import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateSplit } from '../split';

const errorMsgs = {
  NULL_SPLIT: () => 'you passed a null or undefined split name, split name must be a non-empty string.',
  WRONG_TYPE_SPLIT: () => 'you passed an invalid split name, split name must be a non-empty string.',
  EMPTY_SPLIT: () => 'you passed an empty split name, split name must be a non-empty string.',
  TRIMMABLE_SPLIT: (splitName: string) => `split name "${splitName}" has extra whitespace, trimming.`
};

const invalidSplits = [
  { split: [], msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: () => { }, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: Object.create({}), msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: {}, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: true, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: false, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: 10, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: 0, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: NaN, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: Infinity, msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: null, msg: errorMsgs.NULL_SPLIT },
  { split: undefined, msg: errorMsgs.NULL_SPLIT },
  { split: new Promise(res => res), msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: Symbol('asd'), msg: errorMsgs.WRONG_TYPE_SPLIT },
  { split: '', msg: errorMsgs.EMPTY_SPLIT }
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

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });

  test('Should trim split name if it is a valid string with trimmable spaces and log a warning (if those are enabled)', () => {
    for (let i = 0; i < trimmableSplits.length; i++) {
      const trimmableSplit = trimmableSplits[i];
      expect(validateSplit(loggerMock, trimmableSplit, 'some_method_splitName')).toBe(trimmableSplit.trim()); // It should return the trimmed version of the split name received.
      expect(loggerMock.warn.mock.calls[0][0]).toEqual(`some_method_splitName: ${errorMsgs.TRIMMABLE_SPLIT(trimmableSplit)}`); // Should log a warning if those are enabled.

      loggerMock.warn.mockClear();
    }

    expect(loggerMock.error.mock.calls.length).toBe(0); // It should have not logged any errors.
  });

  test('Should return false and log error if split name is not a valid string', () => {
    for (let i = 0; i < invalidSplits.length; i++) {
      const invalidValue = invalidSplits[i]['split'];
      // @ts-ignore
      const expectedLog = invalidSplits[i]['msg'](invalidValue);

      expect(validateSplit(loggerMock, invalidValue, 'test_method')).toBe(false); // Invalid event types should always return false.
      expect(loggerMock.error.mock.calls[0][0]).toEqual(`test_method: ${expectedLog}`); // Should log the error for the invalid event type.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });
});
