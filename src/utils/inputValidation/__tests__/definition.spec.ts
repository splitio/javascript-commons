import { ERROR_INVALID, ERROR_NULL, ERROR_EMPTY, WARN_TRIMMING } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateDefinition } from '../definition';

const invalidDefinitions = [
  { definition: [], msg: ERROR_INVALID },
  { definition: () => { }, msg: ERROR_INVALID },
  { definition: Object.create({}), msg: ERROR_INVALID },
  { definition: {}, msg: ERROR_INVALID },
  { definition: true, msg: ERROR_INVALID },
  { definition: false, msg: ERROR_INVALID },
  { definition: 10, msg: ERROR_INVALID },
  { definition: 0, msg: ERROR_INVALID },
  { definition: NaN, msg: ERROR_INVALID },
  { definition: Infinity, msg: ERROR_INVALID },
  { definition: null, msg: ERROR_NULL },
  { definition: undefined, msg: ERROR_NULL },
  { definition: new Promise(res => res), msg: ERROR_INVALID },
  { definition: Symbol('asd'), msg: ERROR_INVALID },
  { definition: '', msg: ERROR_EMPTY }
];

const trimmableDefinitions = [
  '  splitName  ',
  'split_name2   \n  ',
  ' split_name3'
];

describe('INPUT VALIDATION for definition name', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the provided definition name if it is a valid string without logging any errors', () => {
    expect(validateDefinition(loggerMock, 'definitionName', 'some_method')).toBe('definitionName');
    expect(loggerMock.error.mock.calls[0]).not.toEqual('some_method');
    expect(validateDefinition(loggerMock, 'definition_name', 'some_method')).toBe('definition_name');
    expect(loggerMock.error.mock.calls[0]).not.toEqual('some_method');
    expect(validateDefinition(loggerMock, 'A_definition-name_29', 'some_method')).toBe('A_definition-name_29');
    expect(loggerMock.error.mock.calls[0]).not.toEqual('some_method');

    expect(loggerMock.warn).not.toBeCalled();
  });

  test('Should trim definition name if it is a valid string with trimmable spaces and log a warning', () => {
    for (let i = 0; i < trimmableDefinitions.length; i++) {
      const trimmableDefinition = trimmableDefinitions[i];
      expect(validateDefinition(loggerMock, trimmableDefinition, 'some_method')).toBe(trimmableDefinition.trim());
      expect(loggerMock.warn).toBeCalledWith(WARN_TRIMMING, ['some_method', 'feature flag name', trimmableDefinition]);

      loggerMock.warn.mockClear();
    }

    expect(loggerMock.error).not.toBeCalled();
  });

  test('Should return false and log error if definition name is not a valid string', () => {
    for (let i = 0; i < invalidDefinitions.length; i++) {
      const invalidValue = invalidDefinitions[i]['definition'];
      // @ts-ignore
      const expectedLog = invalidDefinitions[i]['msg'];

      expect(validateDefinition(loggerMock, invalidValue, 'test_method')).toBe(false);
      expect(loggerMock.error).toBeCalledWith(expectedLog, ['test_method', 'feature flag name']);

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled();
  });
});
