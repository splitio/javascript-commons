import { CLIENT_NOT_READY, ERROR_CLIENT_DESTROYED } from '../../../logger/constants';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateIfNotDestroyed, validateIfOperational } from '../isOperational';

describe('validateIfNotDestroyed', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return true if the client/factory evaluates as operational (not destroyed).', () => {
    const readinessManagerMock = { isDestroyed: jest.fn(() => false) };

    // @ts-ignore
    expect(validateIfNotDestroyed(loggerMock, readinessManagerMock)).toBe(true); // It should return true if the client is operational (it is NOT destroyed).
    expect(readinessManagerMock.isDestroyed).toBeCalledTimes(1); // It checks for destroyed status using the context.
    expect(loggerMock.error).not.toBeCalled(); // Should not log any errors.
    expect(loggerMock.warn).not.toBeCalled(); // Should not log any warnings.
  });

  test('Should return false and log error if attributes map is invalid', () => {
    const readinessManagerMock = { isDestroyed: jest.fn(() => true) };

    // @ts-ignore
    expect(validateIfNotDestroyed(loggerMock, readinessManagerMock, 'test_method')).toBe(false); // It should return false if the client is NOT operational (it is destroyed).
    expect(readinessManagerMock.isDestroyed).toBeCalledTimes(1); // It checks for destroyed status using the context.
    expect(loggerMock.error).toBeCalledWith(ERROR_CLIENT_DESTROYED, ['test_method']); // Should log an error.
    expect(loggerMock.warn).not.toBeCalled(); // But it should not log any warnings.
  });
});

describe('validateIfOperational', () => {

  test('Should return true and log nothing if the SDK was ready.', () => {
    const readinessManagerMock = { isReady: jest.fn(() => true) };

    // @ts-ignore
    expect(validateIfOperational(loggerMock, readinessManagerMock, 'test_method')).toBe(true); // It should return true if SDK was ready.
    expect(readinessManagerMock.isReady).toBeCalledTimes(1); // It checks for readiness status using the context.
    expect(loggerMock.warn).not.toBeCalled(); // But it should not log any warnings.
    expect(loggerMock.error).not.toBeCalled(); // But it should not log any errors.
  });

  test('Should return true and log nothing if the SDK was ready from cache.', () => {
    const readinessManagerMock = { isReady: jest.fn(() => false), isReadyFromCache: jest.fn(() => true) };

    // @ts-ignore
    expect(validateIfOperational(loggerMock, readinessManagerMock, 'test_method')).toBe(true); // It should return true if SDK was ready.
    expect(readinessManagerMock.isReady).toBeCalledTimes(1); // It checks for SDK_READY status.
    expect(readinessManagerMock.isReadyFromCache).toBeCalledTimes(1); // It checks for SDK_READY_FROM_CACHE status.
    expect(loggerMock.warn).not.toBeCalled(); // But it should not log any warnings.
    expect(loggerMock.error).not.toBeCalled(); // But it should not log any errors.
  });

  test('Should return false and log a warning if the SDK was not ready.', () => {
    const readinessManagerMock = { isReady: jest.fn(() => false), isReadyFromCache: jest.fn(() => false) };

    // @ts-ignore
    expect(validateIfOperational(loggerMock, readinessManagerMock, 'test_method')).toBe(false); // It should return true if SDK was ready.
    expect(readinessManagerMock.isReady).toBeCalledTimes(1); // It checks for SDK_READY status.
    expect(readinessManagerMock.isReadyFromCache).toBeCalledTimes(1); // It checks for SDK_READY_FROM_CACHE status.
    expect(loggerMock.warn).toBeCalledWith(CLIENT_NOT_READY, ['test_method', '']); // It should log the expected warning.
    expect(loggerMock.error).not.toBeCalled(); // But it should not log any errors.
  });
});
