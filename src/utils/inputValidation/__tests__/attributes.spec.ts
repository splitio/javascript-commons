import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';

import { validateAttributes } from '../attributes';

const invalidAttributes = [
  [],
  () => { },
  false,
  true,
  5,
  'something',
  NaN,
  -Infinity,
  new Promise(res => res),
  Symbol('asd'),
  NaN
];

describe('INPUT VALIDATION for Attributes', () => {

  test('Should return the passed object if it is a valid attributes map without logging any errors', () => {
    const validAttributes = { amIvalid: 'yes', 'are_you_sure': true, howMuch: 10 };

    expect(validateAttributes(validAttributes, 'some_method_attrs')).toEqual(validAttributes); // It should return the passed map if it is valid.
    expect(loggerMock.e.mock.calls.length).toBe(0); // Should not log any errors.
    expect(loggerMock.w.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear;
  });

  test('Should return the passed value if it is null or undefined (since attributes are optional) without logging any errors', () => {
    expect(validateAttributes(null, 'some_method_attrs')).toBe(null); // It should return the passed null.
    expect(validateAttributes(undefined, 'some_method_attrs')).toBe(undefined); // It should return the passed undefined.
    expect(loggerMock.e.mock.calls.length).toBe(0); // Should not log any errors.
    expect(loggerMock.w.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear();
  });

  test('Should return false and log error if attributes map is invalid', () => {
    for (let i = 0; i < invalidAttributes.length; i++) {
      const invalidAttribute = invalidAttributes[i];

      expect(validateAttributes(invalidAttribute, 'test_method')).toBe(false); // Invalid attribute objects should return false.
      expect(loggerMock.e.mock.calls[0][0]).toEqual('test_method: attributes must be a plain object.'); // The error should be logged for the invalid attributes map.

      loggerMock.e.mockClear();
    }

    expect(loggerMock.w.mock.calls.length).toBe(0); // It should have not logged any warnings.

    mockClear();
  });
});
