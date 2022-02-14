import { ERROR_EMPTY, ERROR_INVALID, ERROR_INVALID_KEY_OBJECT, ERROR_NULL, ERROR_TOO_LONG, WARN_CONVERTING } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateKey } from '../key';

const invalidKeys = [
  { key: '', msg: ERROR_EMPTY },
  { key: 'a'.repeat(251), msg: ERROR_TOO_LONG },
  { key: null, msg: ERROR_NULL },
  { key: undefined, msg: ERROR_NULL },
  { key: () => { }, msg: ERROR_INVALID },
  { key: new Promise<void>(r => r()), msg: ERROR_INVALID },
  { key: Symbol('asd'), msg: ERROR_INVALID },
  { key: [], msg: ERROR_INVALID },
  { key: true, msg: ERROR_INVALID },
  { key: NaN, msg: ERROR_INVALID },
  { key: Infinity, msg: ERROR_INVALID },
  { key: -Infinity, msg: ERROR_INVALID },
];

const stringifyableKeys = [
  { key: 200, msg: WARN_CONVERTING },
  { key: 1235891238571295, msg: WARN_CONVERTING },
  { key: 0, msg: WARN_CONVERTING }
];

const invalidKeyObjects = [
  {},
  { matchingKey: 'asd' },
  { bucketingKey: 'asd' },
  { key: 'asd', bucketingKey: 'asdf' },
  { random: 'asd' }
];

describe('INPUT VALIDATION for Key', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('String and Object keys / Should return the key with no errors logged if the key is correct', () => {
    const validKey = 'validKey';
    const validObjKey = {
      matchingKey: 'valid', bucketingKey: 'alsoValid'
    };

    expect(validateKey(loggerMock, validKey, 'some_method_keys')).toEqual(validKey); // It will return the valid key.
    expect(loggerMock.error).not.toBeCalled(); // No errors should be logged.

    expect(validateKey(loggerMock, validObjKey, 'some_method_keys')).toEqual(validObjKey); // It will return the valid key.
    expect(loggerMock.error).not.toBeCalled(); // No errors should be logged.

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('String key / Should return false and log error if key is invalid', () => {
    for (let i = 0; i < invalidKeys.length; i++) {
      const invalidKey = invalidKeys[i]['key'];
      const expectedLog = invalidKeys[i]['msg'];

      expect(validateKey(loggerMock, invalidKey, 'test_method')).toBe(false); // Invalid keys should return false.
      expect(loggerMock.error).toBeCalledWith(expectedLog, ['test_method', 'key']); // The error should be logged for the invalid key.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('String key / Should return stringified version of the key if it is convertible to one and log a warning.', () => {
    for (let i = 0; i < stringifyableKeys.length; i++) {
      const invalidKey = stringifyableKeys[i]['key'];
      const expectedLog = stringifyableKeys[i]['msg'];

      validateKey(loggerMock, invalidKey, 'test_method');
      expect(loggerMock.warn).toBeCalledWith(expectedLog, ['test_method', 'key', invalidKey]); // But if the logger allows for warnings, it should be logged.

      loggerMock.warn.mockClear();
    }

    expect(loggerMock.error).not.toBeCalled(); // It should have not logged any errors.
  });

  test('Object key / Should return false and log error if a part of the key is invalid', () => {
    // Test invalid object format
    for (let i = 0; i < invalidKeyObjects.length; i++) {
      expect(validateKey(loggerMock, invalidKeyObjects[i], 'test_method')).toBe(false); // Invalid key objects should return false.
      expect(loggerMock.error).lastCalledWith(ERROR_INVALID_KEY_OBJECT, ['test_method']); // The error should be logged for the invalid key.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.

    loggerMock.mockClear();
    // Test invalid matchingKey
    for (let i = 0; i < invalidKeys.length; i++) {
      const invalidKey = {
        matchingKey: invalidKeys[i]['key'],
        bucketingKey: 'thisIsValid'
      };
      const expectedLog = invalidKeys[i]['msg'];

      expect(validateKey(loggerMock, invalidKey, 'test_method')).toBe(false); // Invalid keys should return false.
      expect(loggerMock.error).toBeCalledWith(expectedLog, ['test_method', 'matchingKey']); // The error should be logged for the invalid key.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.

    loggerMock.mockClear();

    // Test invalid bucketingKey
    for (let i = 0; i < invalidKeys.length; i++) {
      const invalidKey = {
        matchingKey: 'thisIsValidToo',
        bucketingKey: invalidKeys[i]['key']
      };
      const expectedLog = invalidKeys[i]['msg'];

      expect(validateKey(loggerMock, invalidKey, 'test_method')).toBe(false); // Invalid keys should return false.
      expect(loggerMock.error).toBeCalledWith(expectedLog, ['test_method', 'bucketingKey']); // The error should be logged for the invalid key.

      loggerMock.error.mockClear();
    }

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.

    loggerMock.mockClear();

    // Just one test that if both are invalid we get the log for both.
    let invalidKey = {
      matchingKey: invalidKeys[0]['key'],
      bucketingKey: invalidKeys[1]['key']
    };
    let expectedLogMK = invalidKeys[0]['msg'];
    let expectedLogBK = invalidKeys[1]['msg'];

    expect(validateKey(loggerMock, invalidKey, 'test_method')).toBe(false); // Invalid keys should return false.
    expect(loggerMock.error).nthCalledWith(1, expectedLogMK, ['test_method', 'matchingKey']); // The error should be logged for the invalid key property.
    expect(loggerMock.error).nthCalledWith(2, expectedLogBK, ['test_method', 'bucketingKey']); // The error should be logged for the invalid key property.

    expect(loggerMock.warn).not.toBeCalled(); // It should have not logged any warnings.
  });

  test('Object key / Should return stringified version of the key props if those are convertible and log the corresponding warnings', () => {
    let invalidKey = {
      matchingKey: stringifyableKeys[0]['key'],
      bucketingKey: stringifyableKeys[1]['key']
    };
    let expectedKey = {
      matchingKey: String(invalidKey.matchingKey),
      bucketingKey: String(invalidKey.bucketingKey),
    };
    let expectedLogMK = stringifyableKeys[0]['msg'];
    let expectedLogBK = stringifyableKeys[1]['msg'];

    expect(validateKey(loggerMock, invalidKey, 'test_method')).toEqual(expectedKey); // If a key object had stringifyable values, those will be stringified and Key returned.
    expect(loggerMock.warn).nthCalledWith(1, expectedLogMK, ['test_method', 'matchingKey', invalidKey.matchingKey]); // The warning should be logged for the stringified prop if warnings are enabled.
    expect(loggerMock.warn).nthCalledWith(2, expectedLogBK, ['test_method', 'bucketingKey', invalidKey.bucketingKey]); // The warning should be logged for the stringified prop if warnings are enabled.

    expect(loggerMock.error).not.toBeCalled(); // It should have not logged any errors.
  });
});
