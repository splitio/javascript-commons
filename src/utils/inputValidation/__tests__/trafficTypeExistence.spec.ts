import { IReadinessManager } from '../../../readiness/types';
import { ISplitsCacheBase } from '../../../storages/types';
import { LOCALHOST_MODE, STANDALONE_MODE } from '../../constants';
import { thenable } from '../../promise/thenable';
import { WARN_NOT_EXISTENT_TT } from '../../../logger/constants';

/** Mocks */
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

const TEST_EXISTENT_TT = 'test_existent_tt';
const TEST_NOT_EXISTENT_TT = 'test_not_existent_tt';
const TEST_EXISTENT_ASYNC_TT = 'test_existent_async_tt';
const TEST_NOT_EXISTENT_ASYNC_TT = 'test_not_existent_async_tt';

const readinessManagerMock = {
  isReady: jest.fn(() => false) // start as non-ready
} as IReadinessManager & { isReady: jest.Mock };

const splitsCacheMock = {
  trafficTypeExists: jest.fn((ttName: string) => {
    switch (ttName) {
      case TEST_EXISTENT_TT: return true;
      case TEST_EXISTENT_ASYNC_TT: return Promise.resolve(true);
      case TEST_NOT_EXISTENT_ASYNC_TT: return Promise.resolve(false);
    }
    return false;
  })
} as ISplitsCacheBase & { trafficTypeExists: jest.Mock };

/** Test target */
import { validateTrafficTypeExistence } from '../trafficTypeExistence';

describe('validateTrafficTypeExistence', () => {

  afterEach(() => {
    loggerMock.mockClear();
    splitsCacheMock.trafficTypeExists.mockClear();
  });

  test('Should return true without going to the storage and log nothing if the SDK is not ready or in localhost mode', () => {
    // Not ready and not localstorage
    expect(validateTrafficTypeExistence(loggerMock, readinessManagerMock, splitsCacheMock, STANDALONE_MODE, 'test_tt', 'test_method')).toBe(true); // If the SDK is not ready yet, it will return true.
    expect(splitsCacheMock.trafficTypeExists).not.toBeCalled(); // If the SDK is not ready yet, it does not try to go to the storage.
    expect(loggerMock.error).not.toBeCalled(); // If the SDK is not ready yet, it will not log any errors.
    expect(loggerMock.error).not.toBeCalled(); // If the SDK is not ready yet, it will not log any errors.

    // Ready and in localstorage mode.
    readinessManagerMock.isReady.mockImplementation(() => true);
    expect(validateTrafficTypeExistence(loggerMock, readinessManagerMock, splitsCacheMock, LOCALHOST_MODE, 'test_tt', 'test_method')).toBe(true); // If the SDK is in localhost mode, it will return true.
    expect(splitsCacheMock.trafficTypeExists).not.toBeCalled(); // If the SDK is in localhost mode, it does not try to go to the storage.
    expect(loggerMock.warn).not.toBeCalled(); // If the SDK is in localhost mode, it will not log any warnings.
    expect(loggerMock.error).not.toBeCalled(); // If the SDK is in localhost mode, it will not log any errors.
  });

  test('Should return true and log nothing if SDK Ready, not localhost mode and the traffic type exists in the storage', () => {
    // Ready, standalone, and the TT exists in the storage.
    readinessManagerMock.isReady.mockImplementation(() => true);

    expect(validateTrafficTypeExistence(loggerMock, readinessManagerMock, splitsCacheMock, STANDALONE_MODE, TEST_EXISTENT_TT, 'test_method')).toBe(true); // If the SDK is in condition to validate but the TT exists, it will return true.
    expect(splitsCacheMock.trafficTypeExists.mock.calls).toEqual([[TEST_EXISTENT_TT]]); // If the SDK is in condition to validate, it checks that TT existence with the storage.
    expect(loggerMock.warn).not.toBeCalled(); // If the SDK is in condition to validate but the TT exists, it will not log any warnings.
    expect(loggerMock.error).not.toBeCalled(); // If the SDK is in condition to validate but the TT exists, it will not log any errors.
  });

  test('Should return false and log warning if SDK Ready, not localhost mode and the traffic type does NOT exist in the storage', () => {
    // Ready, standalone, and the TT not exists in the storage.
    expect(validateTrafficTypeExistence(loggerMock, readinessManagerMock, splitsCacheMock, STANDALONE_MODE, TEST_NOT_EXISTENT_TT, 'test_method_y')).toBe(false); // If the SDK is in condition to validate but the TT does not exist in the storage, it will return false.
    expect(splitsCacheMock.trafficTypeExists.mock.calls).toEqual([[TEST_NOT_EXISTENT_TT]]); // If the SDK is in condition to validate, it checks that TT existence with the storage.
    expect(loggerMock.warn).toBeCalledWith(WARN_NOT_EXISTENT_TT, ['test_method_y', TEST_NOT_EXISTENT_TT]); // If the SDK is in condition to validate but the TT does not exist in the storage, it will log the expected warning.
    expect(loggerMock.error).not.toBeCalled(); // It logged a warning so no errors should be logged.
  });

  test('validateTrafficTypeExistence w/async storage - If the storage is async but the SDK is in condition to validate, it will validate that the TT exists on the storage', async () => {
    // Ready, standalone, the TT exists in the storage.

    const validationPromise = validateTrafficTypeExistence(loggerMock, readinessManagerMock, splitsCacheMock, STANDALONE_MODE, TEST_EXISTENT_ASYNC_TT, 'test_method_z');
    expect(thenable(validationPromise)).toBe(true); // If the storage is async, it should also return a promise.
    expect(splitsCacheMock.trafficTypeExists.mock.calls).toEqual([[TEST_EXISTENT_ASYNC_TT]]); // If the SDK is in condition to validate, it checks that TT existence with the async storage.
    expect(loggerMock.warn).not.toBeCalled(); // We are still fetching the data from the storage, no logs yet.
    expect(loggerMock.error).not.toBeCalled(); // We are still fetching the data from the storage, no logs yet.

    const isValid = await validationPromise;

    expect(isValid).toBe(true); // As the split existed, it will resolve to true.
    expect(loggerMock.warn).not.toBeCalled(); // It was valid so no logs.
    expect(loggerMock.error).not.toBeCalled(); // It was valid so no logs.

    // Second round, a TT that does not exist on the asnyc storage
    splitsCacheMock.trafficTypeExists.mockClear();

    const validationPromise2 = validateTrafficTypeExistence(loggerMock, readinessManagerMock, splitsCacheMock, STANDALONE_MODE, TEST_NOT_EXISTENT_ASYNC_TT, 'test_method_z');
    expect(thenable(validationPromise2)).toBe(true); // If the storage is async, it should also return a promise.
    expect(splitsCacheMock.trafficTypeExists.mock.calls).toEqual([[TEST_NOT_EXISTENT_ASYNC_TT]]); // If the SDK is in condition to validate, it checks that TT existence with the async storage.
    expect(loggerMock.warn).not.toBeCalled(); // We are still fetching the data from the storage, no logs yet.
    expect(loggerMock.error).not.toBeCalled(); // We are still fetching the data from the storage, no logs yet.

    const isValid2 = await validationPromise2;
    expect(isValid2).toBe(false); // As the split is not on the storage, it will resolve to false, failing the validation..
    expect(loggerMock.warn).toBeCalledWith(WARN_NOT_EXISTENT_TT, ['test_method_z', TEST_NOT_EXISTENT_ASYNC_TT]); // If the SDK is in condition to validate but the TT does not exist in the storage, it will log the expected warning.
    expect(loggerMock.error).not.toBeCalled(); // It logged a warning so no errors should be logged.
  });
});
