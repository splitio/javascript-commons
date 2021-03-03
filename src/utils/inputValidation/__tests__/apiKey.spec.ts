import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';

import { validateApiKey, validateAndTrackApiKey, releaseApiKey } from '../apiKey';

const errorMsgs = {
  WRONG_TYPE_API_KEY: 'Factory instantiation: you passed an invalid api_key, api_key must be a non-empty string.',
  EMPTY_API_KEY: 'Factory instantiation: you passed an empty api_key, api_key must be a non-empty string.',
  NULL_API_KEY: 'Factory instantiation: you passed a null or undefined api_key, api_key must be a non-empty string.'
};

const invalidKeys = [
  { key: '', msg: errorMsgs.EMPTY_API_KEY },
  { key: null, msg: errorMsgs.NULL_API_KEY },
  { key: undefined, msg: errorMsgs.NULL_API_KEY },
  { key: () => { }, msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: new Promise(r => r()), msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: Symbol('asd'), msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: [], msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: true, msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: NaN, msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: Infinity, msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: -Infinity, msg: errorMsgs.WRONG_TYPE_API_KEY },
  { key: {}, msg: errorMsgs.WRONG_TYPE_API_KEY }
];

describe('validateApiKey', () => {

  test('Should return the passed api key if it is a valid string without logging any errors', () => {
    const validApiKey = 'qjok3snti4dgsticade5hfphmlucarsflv14';

    expect(validateApiKey(loggerMock, validApiKey)).toBe(validApiKey); // It should return the passed string if it is valid.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.

    mockClear();
  });

  test('Should return false and log error if the api key is invalid', () => {
    for (let i = 0; i < invalidKeys.length; i++) {
      const invalidApiKey = invalidKeys[i]['key'];
      const expectedLog = invalidKeys[i]['msg'];

      expect(validateApiKey(loggerMock, invalidApiKey)).toBe(false); // Invalid strings should return false.
      expect(loggerMock.error.mock.calls[0][0]).toEqual(expectedLog); // The error should be logged for the invalid string.

      loggerMock.error.mockClear();
    }

    mockClear();
  });
});

describe('validateAndTrackApiKey', () => {

  test('Should log a warning if we are instantiating more than one factory (different api keys)', () => {
    const validApiKey1 = 'qjok3snti4dgsticade5hfphmlucarsflv14';
    const validApiKey2 = 'qjok3snti4dgsticade5hfphmlucars92uih';
    const validApiKey3 = '84ynbsnti4dgsticade5hfphmlucars92uih';

    expect(validateAndTrackApiKey(loggerMock, validApiKey1)).toBe(validApiKey1);
    expect(loggerMock.warn.mock.calls.length).toBe(0); // If this is the first api key we are registering, there is no warning.

    expect(validateAndTrackApiKey(loggerMock, validApiKey2)).toBe(validApiKey2);
    expect(loggerMock.warn.mock.calls).toEqual([['Factory instantiation: You already have an instance of the Split factory. Make sure you definitely want this additional instance. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application.']]); // We register a new api key, we get a warning.

    expect(validateAndTrackApiKey(loggerMock, validApiKey3)).toBe(validApiKey3);
    expect(loggerMock.warn.mock.calls[0]).toEqual(['Factory instantiation: You already have an instance of the Split factory. Make sure you definitely want this additional instance. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application.']); // We register a new api key, we get a warning.

    // We will release the used keys and expect no warnings next time.
    releaseApiKey(validApiKey1);
    releaseApiKey(validApiKey2);
    releaseApiKey(validApiKey3);

    mockClear();

    expect(validateAndTrackApiKey(loggerMock, validApiKey1)).toBe(validApiKey1);
    expect(loggerMock.warn.mock.calls.length).toBe(0); // If all the keys were released and we try again, there is no warning.

    releaseApiKey(validApiKey1); // clean up the cache of api keys for next test
    mockClear();
  });

  test('Should log a warning if we are instantiating more than one factory (same api key)', () => {
    const validApiKey = '84ynbsnti4dgsticade5hfphmlucars92uih';

    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);
    expect(loggerMock.warn.mock.calls.length).toBe(0); // If this is the first api key we are registering, there is no warning.

    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);

    // Same key one more time, 2 instances plus new one.
    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);

    // Same key one more time, 3 instances plus new one.
    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);

    expect(loggerMock.warn.mock.calls).toEqual([
      ['Factory instantiation: You already have 1 factory with this API Key. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application.'], // We register a the same api key again, we get a warning with the number of instances we have.
      ['Factory instantiation: You already have 2 factories with this API Key. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application.'], // We register a the same api key again, we get a warning with the number of instances we have.
      ['Factory instantiation: You already have 3 factories with this API Key. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application.'] // We register a the same api key again, we get a warning with the number of instances we have.
    ]);

    // We will release the used api key leaving only 1 "use" on the cache.
    releaseApiKey(validApiKey);
    releaseApiKey(validApiKey);
    releaseApiKey(validApiKey);

    mockClear();

    // So we get the warning again.
    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);
    expect(loggerMock.warn.mock.calls).toEqual([['Factory instantiation: You already have 1 factory with this API Key. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application.']]); // We register a the same api key again, we get a warning with the number of instances we have.

    // Leave it with 0
    releaseApiKey(validApiKey);
    releaseApiKey(validApiKey);

    mockClear();

    expect(validateAndTrackApiKey(loggerMock, validApiKey)).toBe(validApiKey);
    expect(loggerMock.warn.mock.calls.length).toBe(0); // s users, there is no warning when we use it again.

    releaseApiKey(validApiKey); // clean up the cache just in case a new test is added
    mockClear();
  });
});
