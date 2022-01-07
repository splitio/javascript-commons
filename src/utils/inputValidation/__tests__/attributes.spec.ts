import { ERROR_NOT_PLAIN_OBJECT } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateAttributes, validateAttributesDeep } from '../attributes';

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

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the passed object if it is a valid attributes map without logging any errors', () => {
    const validAttributes = { amIvalid: 'yes', 'are_you_sure': true, howMuch: 10 };

    expect(validateAttributes(loggerMock, validAttributes, 'some_method_attrs')).toEqual(validAttributes); // It should return the passed map if it is valid.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('Should return the passed value if it is null or undefined (since attributes are optional) without logging any errors', () => {
    expect(validateAttributes(loggerMock, null, 'some_method_attrs')).toBe(null); // It should return the passed null.
    expect(validateAttributes(loggerMock, undefined, 'some_method_attrs')).toBe(undefined); // It should return the passed undefined.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('Should return false and log error if attributes map is invalid', () => {
    for (let i = 0; i < invalidAttributes.length; i++) {
      const invalidAttribute = invalidAttributes[i];

      expect(validateAttributes(loggerMock, invalidAttribute, 'test_method')).toBe(false); // Invalid attribute objects should return false.
      expect(loggerMock.error).lastCalledWith(ERROR_NOT_PLAIN_OBJECT, ['test_method', 'attributes']); // The error should be logged for the invalid attributes map.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });
});

describe('DEEP INPUT VALIDATION for Attributes', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return true if it is a valid attributes map without logging any errors', () => {
    const validAttributes = { amIvalid: 'yes', 'are_you_sure': true, howMuch: 10, 'spell': ['1', '0'] };

    expect(validateAttributesDeep(loggerMock, validAttributes, 'some_method_attrs')).toEqual(true); // It should return true if it is valid.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.

  });

  test('Should return false and log error if attributes map is invalid', () => {

    expect(validateAttributesDeep(loggerMock, { '': 'empty' }, 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute key is not a string
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': new Date() }, 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': { 'some': 'object' } }, 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': Infinity }, 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.

  });

  test('Should return true if attributes map is valid', () => {
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': 'attributeValue' }, 'some_method_args')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': ['attribute', 'value'] }, 'some_method_args')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': 25 }, 'some_method_args')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': false }, 'some_method_args')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
    expect(validateAttributesDeep(loggerMock, { 'attributeKey': Date.now() }, 'some_method_args')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.

    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.

  });
});
