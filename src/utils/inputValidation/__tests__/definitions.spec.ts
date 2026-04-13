import uniq from 'lodash/uniq';
import startsWith from 'lodash/startsWith';

// mocks sdkLogger
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { ERROR_EMPTY_ARRAY } from '../../../logger/constants';

// mocks validateDefinition
jest.mock('../definition');
import { validateDefinition } from '../definition';
const validateDefinitionMock = validateDefinition as jest.Mock;
validateDefinitionMock.mockImplementation((_, maybeDefinition) => maybeDefinition);

// test target
import { validateDefinitions } from '../definitions';

const invalidDefinitions = [
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

describe('INPUT VALIDATION for definition names', () => {

  afterEach(() => {
    loggerMock.mockClear();
    validateDefinitionMock.mockClear();
  });

  test('Should return the provided array if it is a valid definition names array without logging any errors', () => {
    const validArr = ['definitionName1', 'definition_name_2', 'definition-name-3'];

    expect(validateDefinitions(loggerMock, validArr, 'some_method')).toEqual(validArr);
    expect(validateDefinitionMock).toBeCalledTimes(validArr.length);
    expect(loggerMock.error).not.toBeCalled();

    expect(loggerMock.warn).not.toBeCalled();
  });

  test('Should return the provided array if it is a valid definition names array removing duplications, without logging any errors', () => {
    const validArr = ['definition_name', 'definition_name', 'definition-name'];

    expect(validateDefinitions(loggerMock, validArr, 'some_method')).toEqual(uniq(validArr));
    expect(validateDefinitionMock).toBeCalledTimes(validArr.length);
    expect(loggerMock.error).not.toBeCalled();

    expect(loggerMock.warn).not.toBeCalled();
  });

  test('Should return false and log an error for the array if it is invalid', () => {
    for (let i = 0; i < invalidDefinitions.length; i++) {
      expect(validateDefinitions(loggerMock, invalidDefinitions[i], 'test_method')).toBe(false);
      expect(loggerMock.error).toBeCalledWith(ERROR_EMPTY_ARRAY, ['test_method', 'feature flag names']);
      expect(validateDefinitionMock).not.toBeCalled();

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled();
  });

  test('Should strip out any invalid value from the array', () => {
    validateDefinitionMock.mockImplementation((_, value) => startsWith(value, 'invalid') ? false : value);
    const myArr = ['valid_name', 'invalid_name', 'invalid_val_2', 'something_valid'];

    expect(validateDefinitions(loggerMock, myArr, 'test_method')).toEqual(['valid_name', 'something_valid']);

    for (let i = 0; i < myArr.length; i++) {
      expect(validateDefinitionMock.mock.calls[i]).toEqual([loggerMock, myArr[i], 'test_method', 'feature flag name']);
    }

    expect(loggerMock.error).not.toBeCalled();
    expect(loggerMock.warn).not.toBeCalled();
  });
});
