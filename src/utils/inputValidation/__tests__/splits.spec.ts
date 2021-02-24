import uniq from 'lodash/uniq';
import startsWith from 'lodash/startsWith';

// mocks sdkLogger
import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';

// mocks validateSplit
jest.mock('../split');
import { validateSplit } from '../split';
const validateSplitMock = validateSplit as jest.Mock;
validateSplitMock.mockImplementation((maybeSplit) => maybeSplit);

// test target
import { validateSplits } from '../splits';

const invalidSplits = [
  [],
  {},
  Object.create({}),
  () => { },
  false,
  true,
  5,
  'something',
  NaN,
  -Infinity,
  new Promise(res => res),
  Symbol('asd'),
  null,
  undefined,
  NaN
];

describe('INPUT VALIDATION for Split names', () => {

  afterEach(() => {
    mockClear();
    validateSplitMock.mockClear();
  });

  test('Should return the provided array if it is a valid splits names array without logging any errors', () => {
    const validArr = ['splitName1', 'split_name_2', 'split-name-3'];

    expect(validateSplits(validArr, 'some_method_splits')).toEqual(validArr); // It should return the provided array without changes if it is valid.
    expect(validateSplitMock.mock.calls.length).toBe(validArr.length); // Should have validated each value independently.
    expect(loggerMock.e.mock.calls.length).toBe(0); // Should not log any errors on the collection.

    expect(loggerMock.w.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });

  test('Should return the provided array if it is a valid splits names array removing duplications, without logging any errors', () => {
    const validArr = ['split_name', 'split_name', 'split-name'];

    expect(validateSplits(validArr, 'some_method_splits')).toEqual(uniq(validArr)); // It should return the provided array without changes if it is valid.
    expect(validateSplitMock.mock.calls.length).toBe(validArr.length); // Should have validated each value independently.
    expect(loggerMock.e.mock.calls.length).toBe(0); // Should not log any errors on the collection.

    expect(loggerMock.w.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });

  test('Should return false and log an error for the array if it is invalid', () => {
    for (let i = 0; i < invalidSplits.length; i++) {
      expect(validateSplits(invalidSplits[i], 'test_method')).toBe(false); // It will return false as the array is of an incorrect type.
      expect(loggerMock.e.mock.calls).toEqual([['test_method: split_names must be a non-empty array.']]); // Should log the error for the collection.
      expect(validateSplitMock.mock.calls.length).toBe(0); // Should not try to validate any inner value if there is no valid array.

      loggerMock.e.mockClear();
    }

    expect(loggerMock.w.mock.calls.length).toBe(0); // It should have not logged any warnings.
  });

  test('Should strip out any invalid value from the array', () => {
    // We use a mock function for individual validation.
    validateSplitMock.mockImplementation(value => startsWith(value, 'invalid') ? false : value);
    const myArr = ['valid_name', 'invalid_name', 'invalid_val_2', 'something_valid'];

    expect(validateSplits(myArr, 'test_method')).toEqual(['valid_name', 'something_valid']); // It will return the array without the invalid values.

    for (let i = 0; i < myArr.length; i++) {
      expect(validateSplitMock.mock.calls[i]).toEqual([myArr[i], 'test_method', 'split name']); // Should validate any inner value independently.
    }

    expect(loggerMock.e.mock.calls.length).toBe(0); // Should not log any error for the collection.
    expect(loggerMock.w.mock.calls.length).toBe(0); // It should have not logged any warnings for the collection.
  });
});
