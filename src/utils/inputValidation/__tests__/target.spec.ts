import { ERROR_NOT_PLAIN_OBJECT } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateTarget } from '../target';

const invalidTargets = [
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
  null,
  undefined,
];

describe('INPUT VALIDATION for Target', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the validated target if it is a valid object with key and attributes', () => {
    const validTarget = { key: 'validKey', attributes: { attr1: 'value1' } };

    expect(validateTarget(loggerMock, validTarget, 'test_method')).toEqual(validTarget);
    expect(loggerMock.error).not.toBeCalled();
    expect(loggerMock.warn).not.toBeCalled();
  });

  test('Should return the validated target if attributes are undefined', () => {
    const validTarget = { key: 'validKey' };

    expect(validateTarget(loggerMock, validTarget, 'test_method')).toEqual({ key: 'validKey', attributes: undefined });
    expect(loggerMock.error).not.toBeCalled();
  });

  test('Should return false and log error if target is not a plain object', () => {
    for (let i = 0; i < invalidTargets.length; i++) {
      expect(validateTarget(loggerMock, invalidTargets[i], 'test_method')).toBe(false);
      expect(loggerMock.error).toBeCalledWith(ERROR_NOT_PLAIN_OBJECT, ['test_method', 'target']);

      loggerMock.error.mockClear();
    }
  });

  test('Should return false if key is invalid', () => {
    expect(validateTarget(loggerMock, { key: '', attributes: { attr1: 'value1' } }, 'test_method')).toBe(false);
    expect(validateTarget(loggerMock, { key: null }, 'test_method')).toBe(false);
    expect(validateTarget(loggerMock, { key: true }, 'test_method')).toBe(false);
    expect(loggerMock.error).toBeCalled();
  });

  test('Should return false if attributes are invalid', () => {
    expect(validateTarget(loggerMock, { key: 'validKey', attributes: 'invalid' }, 'test_method')).toBe(false);
    expect(validateTarget(loggerMock, { key: 'validKey', attributes: true }, 'test_method')).toBe(false);
    expect(validateTarget(loggerMock, { key: 'validKey', attributes: 5 }, 'test_method')).toBe(false);
    expect(loggerMock.error).toBeCalled();
  });
});
