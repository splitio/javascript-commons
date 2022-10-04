import { validateAttribute } from '../attribute';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';


test('INPUT VALIDATION for Attribute', () => {

  // @ts-ignore
  expect(validateAttribute(loggerMock, 2, 'dos', 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute key is not a string
  expect(validateAttribute(loggerMock, '', 'empty', 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute key is not a string
  // @ts-ignore
  expect(validateAttribute(loggerMock, null, 'null', 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute key is not a string
  // @ts-ignore
  expect(validateAttribute(loggerMock, true, 'boolean', 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute key is not a string
  // @ts-ignore
  expect(validateAttribute(loggerMock, {'some':'object'}, 'object', 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute key is not a string

  expect(validateAttribute(loggerMock, 'attributeKey', new Date(), 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.
  expect(validateAttribute(loggerMock, 'attributeKey', { 'some': 'object' }, 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.
  expect(validateAttribute(loggerMock, 'attributeKey', Infinity, 'some_method_attrs')).toEqual(false); // It should be invalid if the attribute value is not a String, Number, Boolean or Lists.

  expect(validateAttribute(loggerMock, 'attributeKey', 'attributeValue', 'some_method_attrs')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
  expect(validateAttribute(loggerMock, 'attributeKey', ['attribute', 'value'], 'some_method_attrs')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
  expect(validateAttribute(loggerMock, 'attributeKey', 25, 'some_method_attrs')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
  expect(validateAttribute(loggerMock, 'attributeKey', false, 'some_method_attrs')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.
  expect(validateAttribute(loggerMock, 'attributeKey', Date.now(), 'some_method_attrs')).toEqual(true); // It should be valid if the attribute value is a String, Number, Boolean or Lists.

});
