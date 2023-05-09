import { ERROR_EMPTY, ERROR_NULL, ERROR_INVALID, WARN_SDK_KEY } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateSdkKey, validateAndTrackSdkKey, releaseSdkKey } from '../sdkKey';

const invalidKeys = [
  { key: '', msg: ERROR_EMPTY },
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
  { key: {}, msg: ERROR_INVALID }
];

describe('validateSdkKey', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the passed SDK key if it is a valid string without logging any errors', () => {
    const validSdkKey = 'qjok3snti4dgsticade5hfphmlucarsflv14';

    expect(validateSdkKey(loggerMock, validSdkKey)).toBe(validSdkKey); // It should return the passed string if it is valid.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
  });

  test('Should return false and log error if the SDK key is invalid', () => {
    for (let i = 0; i < invalidKeys.length; i++) {
      const invalidSdkKey = invalidKeys[i]['key'];
      const expectedLog = invalidKeys[i]['msg'];

      expect(validateSdkKey(loggerMock, invalidSdkKey)).toBe(false); // Invalid strings should return false.
      expect(loggerMock.error.mock.calls[0][0]).toEqual(expectedLog); // The error should be logged for the invalid string.

      loggerMock.error.mockClear();
    }
  });
});

describe('validateAndTrackSdkKey', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should log a warning if we are instantiating more than one factory (different SDK keys)', () => {
    const validSdkKey1 = 'qjok3snti4dgsticade5hfphmlucarsflv14';
    const validSdkKey2 = 'qjok3snti4dgsticade5hfphmlucars92uih';
    const validSdkKey3 = '84ynbsnti4dgsticade5hfphmlucars92uih';

    expect(validateAndTrackSdkKey(loggerMock, validSdkKey1)).toBe(validSdkKey1);
    expect(loggerMock.warn).not.toBeCalled(); // If this is the first SDK key we are registering, there is no warning.

    expect(validateAndTrackSdkKey(loggerMock, validSdkKey2)).toBe(validSdkKey2);
    expect(validateAndTrackSdkKey(loggerMock, validSdkKey3)).toBe(validSdkKey3);
    expect(loggerMock.warn).toBeCalledWith(WARN_SDK_KEY, ['an instance of the Split factory']); // we get a warning when we register a new SDK key.

    // We will release the used keys and expect no warnings next time.
    releaseSdkKey(validSdkKey1);
    releaseSdkKey(validSdkKey2);
    releaseSdkKey(validSdkKey3);

    loggerMock.mockClear();

    expect(validateAndTrackSdkKey(loggerMock, validSdkKey1)).toBe(validSdkKey1);
    expect(loggerMock.warn).not.toBeCalled(); // If all the keys were released and we try again, there is no warning.

    releaseSdkKey(validSdkKey1); // clean up the cache of SDK keys for next test
  });

  test('Should log a warning if we are instantiating more than one factory (same SDK key)', () => {
    const validSdkKey = '84ynbsnti4dgsticade5hfphmlucars92uih';

    expect(validateAndTrackSdkKey(loggerMock, validSdkKey)).toBe(validSdkKey);
    expect(loggerMock.warn).not.toBeCalled(); // If this is the first SDK key we are registering, there is no warning.

    expect(validateAndTrackSdkKey(loggerMock, validSdkKey)).toBe(validSdkKey);

    // Same key one more time, 2 instances plus new one.
    expect(validateAndTrackSdkKey(loggerMock, validSdkKey)).toBe(validSdkKey);

    // Same key one more time, 3 instances plus new one.
    expect(validateAndTrackSdkKey(loggerMock, validSdkKey)).toBe(validSdkKey);

    expect(loggerMock.warn.mock.calls).toEqual([
      [WARN_SDK_KEY, ['1 factory/ies with this SDK Key']],
      [WARN_SDK_KEY, ['2 factory/ies with this SDK Key']],
      [WARN_SDK_KEY, ['3 factory/ies with this SDK Key']]
    ]); // We get a warning each time we register the same SDK key, with the number of instances we have.

    // We will release the used SDK key leaving only 1 "use" on the cache.
    releaseSdkKey(validSdkKey);
    releaseSdkKey(validSdkKey);
    releaseSdkKey(validSdkKey);

    loggerMock.mockClear();

    // So we get the warning again.
    expect(validateAndTrackSdkKey(loggerMock, validSdkKey)).toBe(validSdkKey);
    expect(loggerMock.warn).toBeCalledWith(WARN_SDK_KEY, ['1 factory/ies with this SDK Key']);

    // Leave it with 0
    releaseSdkKey(validSdkKey);
    releaseSdkKey(validSdkKey);

    loggerMock.mockClear();

    expect(validateAndTrackSdkKey(loggerMock, validSdkKey)).toBe(validSdkKey);
    expect(loggerMock.warn).not.toBeCalled(); // s users, there is no warning when we use it again.

    releaseSdkKey(validSdkKey); // clean up the cache just in case a new test is added
  });
});
