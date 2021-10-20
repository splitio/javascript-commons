import { ERROR_EMPTY, ERROR_NULL, ERROR_INVALID, WARN_API_KEY } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateApiKey, validateAndTrackApiKey, releaseApiKey } from '../apiKey';

const invalidKeys = [
  { key: '', msg: ERROR_EMPTY },
  { key: null, msg: ERROR_NULL },
  { key: undefined, msg: ERROR_NULL },
  { key: () => { }, msg: ERROR_INVALID },
  { key: new Promise(r => r()), msg: ERROR_INVALID },
  { key: Symbol('asd'), msg: ERROR_INVALID },
  { key: [], msg: ERROR_INVALID },
  { key: true, msg: ERROR_INVALID },
  { key: NaN, msg: ERROR_INVALID },
  { key: Infinity, msg: ERROR_INVALID },
  { key: -Infinity, msg: ERROR_INVALID },
  { key: {}, msg: ERROR_INVALID }
];

describe('validateApiKey', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return the passed api key if it is a valid string without logging any errors', () => {
    const validApiKey = 'qjok3snti4dgsticade5hfphmlucarsflv14';

    expect(validateApiKey(loggerMock, validApiKey)).toBe(validApiKey); // It should return the passed string if it is valid.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
  });

  test('Should return false and log error if the api key is invalid', () => {
    for (let i = 0; i < invalidKeys.length; i++) {
      const invalidApiKey = invalidKeys[i]['key'];
      const expectedLog = invalidKeys[i]['msg'];

      expect(validateApiKey(loggerMock, invalidApiKey)).toBe(false); // Invalid strings should return false.
      expect(loggerMock.error.mock.calls[0][0]).toEqual(expectedLog); // The error should be logged for the invalid string.

      loggerMock.error.mockClear();
    }
  });
});

describe('validateAndTrackApiKey', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should log a warning if we are instantiating more than one factory (different api keys)', () => {
    const validApiKey1 = 'qjok3snti4dgsticade5hfphmlucarsflv14';
    const validApiKey2 = 'qjok3snti4dgsticade5hfphmlucars92uih';
    const validApiKey3 = '84ynbsnti4dgsticade5hfphmlucars92uih';

    expect(validateAndTrackApiKey(loggerMock, validApiKey1)).toBe(validApiKey1);
    expect(loggerMock.warn).not.toBeCalled(); // If this is the first api key we are registering, there is no warning.

    expect(validateAndTrackApiKey(loggerMock, validApiKey2)).toBe(validApiKey2);
    expect(validateAndTrackApiKey(loggerMock, validApiKey3)).toBe(validApiKey3);
    expect(loggerMock.warn).toBeCalledWith(WARN_API_KEY, ['an instance of the Split factory']); // we get a warning when we register a new api key.

    // We will release the used keys and expect no warnings next time.
    releaseApiKey(validApiKey1);
    releaseApiKey(validApiKey2);
    releaseApiKey(validApiKey3);

    loggerMock.mockClear();

    expect(validateAndTrackApiKey(loggerMock, validApiKey1)).toBe(validApiKey1);
    expect(loggerMock.warn).not.toBeCalled(); // If all the keys were released and we try again, there is no warning.

    releaseApiKey(validApiKey1); // clean up the cache of api keys for next test
  });

  test('Should log a warning if we are instantiating more than one factory (same api key)', () => {
    const validApiKey = '84ynbsnti4dgsticade5hfphmlucars92uih';

    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);
    expect(loggerMock.warn).not.toBeCalled(); // If this is the first api key we are registering, there is no warning.

    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);

    // Same key one more time, 2 instances plus new one.
    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);

    // Same key one more time, 3 instances plus new one.
    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);

    expect(loggerMock.warn.mock.calls).toEqual([
      [WARN_API_KEY, ['1 factory/ies with this API Key']],
      [WARN_API_KEY, ['2 factory/ies with this API Key']],
      [WARN_API_KEY, ['3 factory/ies with this API Key']]
    ]); // We get a warning each time we register the same api key, with the number of instances we have.

    // We will release the used api key leaving only 1 "use" on the cache.
    releaseApiKey(validApiKey);
    releaseApiKey(validApiKey);
    releaseApiKey(validApiKey);

    loggerMock.mockClear();

    // So we get the warning again.
    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);
    expect(loggerMock.warn).toBeCalledWith(WARN_API_KEY, ['1 factory/ies with this API Key']);

    // Leave it with 0
    releaseApiKey(validApiKey);
    releaseApiKey(validApiKey);

    loggerMock.mockClear();

    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);
    expect(loggerMock.warn).not.toBeCalled(); // s users, there is no warning when we use it again.

    releaseApiKey(validApiKey); // clean up the cache just in case a new test is added
  });
});
