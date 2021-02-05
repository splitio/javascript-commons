import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';

import { validateEventValue } from '../eventValue';

const invalidValues = [
  [],
  () => { },
  false,
  true,
  {},
  Object.create({}),
  'something',
  NaN,
  -Infinity,
  Infinity,
  new Promise(res => res),
  Symbol('asd')
];

describe('INPUT VALIDATION for Event Values', () => {

  test('Should return the passed value if it is a valid finite number without logging any errors', () => {
    expect(validateEventValue(50, 'some_method_eventValue')).toBe(50); // It should return the passed number if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateEventValue(-50, 'some_method_eventValue')).toBe(-50); // It should return the passed number if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear();
  });

  test('Should return the passed value if it is a null or undefined (since it is optional) without logging any errors', () => {
    expect(validateEventValue(null, 'some_method_eventValue')).toBe(null); // It should return the passed number if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(validateEventValue(undefined, 'some_method_eventValue')).toBe(undefined); // It should return the passed number if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear();
  });

  test('Should return false and log error if event value is not a valid finite number', () => {
    for (let i = 0; i < invalidValues.length; i++) {
      const invalidValue = invalidValues[i];

      expect(validateEventValue(invalidValue, 'test_method')).toBe(false); // Invalid event values should always return false.
      expect(loggerMock.error.mock.calls[0][0]).toEqual('test_method: value must be a finite number.'); // Should log the error for the invalid event value.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear();
  });
});
