import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateIfNotDestroyed, validateIfOperational } from '../isOperational';

describe('validateIfNotDestroyed', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return true if the client/factory evaluates as operational (not destroyed).', () => {
    const readinessManagerMock = { isDestroyed: jest.fn(() => false) };

    // @ts-ignore
    expect(validateIfNotDestroyed(loggerMock, readinessManagerMock)).toBe(true); // It should return true if the client is operational (it is NOT destroyed).
    expect(readinessManagerMock.isDestroyed.mock.calls.length).toBe(1); // It checks for destroyed status using the context.
    expect(loggerMock.error.mock.calls.length).toBe(0); // Should not log any errors.
    expect(loggerMock.warn.mock.calls.length).toBe(0); // Should not log any warnings.
  });

  test('Should return false and log error if attributes map is invalid', () => {
    const readinessManagerMock = { isDestroyed: jest.fn(() => true) };

    // @ts-ignore
    expect(validateIfNotDestroyed(loggerMock, readinessManagerMock)).toBe(false); // It should return false if the client is NOT operational (it is destroyed).
    expect(readinessManagerMock.isDestroyed.mock.calls.length).toBe(1); // It checks for destroyed status using the context.
    expect(loggerMock.error.mock.calls).toEqual([['Client has already been destroyed - no calls possible.']]); // Should log an error.
    expect(loggerMock.warn.mock.calls.length).toBe(0); // But it should not log any warnings.
  });
});

describe('validateIfOperational', () => {

  test('Should return true and log nothing if the SDK was ready.', () => {
    const readinessManagerMock = { isReady: jest.fn(() => true) };

    // @ts-ignore
    expect(validateIfOperational(loggerMock, readinessManagerMock, 'test_method')).toBe(true); // It should return true if SDK was ready.
    expect(readinessManagerMock.isReady.mock.calls.length).toBe(1); // It checks for readiness status using the context.
    expect(loggerMock.warn.mock.calls.length).toBe(0); // But it should not log any warnings.
    expect(loggerMock.error.mock.calls.length).toBe(0); // But it should not log any errors.
  });

  test('Should return true and log nothing if the SDK was ready from cache.', () => {
    const readinessManagerMock = { isReady: jest.fn(() => false), isReadyFromCache: jest.fn(() => true) };

    // @ts-ignore
    expect(validateIfOperational(loggerMock, readinessManagerMock, 'test_method')).toBe(true); // It should return true if SDK was ready.
    expect(readinessManagerMock.isReady.mock.calls.length).toBe(1); // It checks for SDK_READY status.
    expect(readinessManagerMock.isReadyFromCache.mock.calls.length).toBe(1); // It checks for SDK_READY_FROM_CACHE status.
    expect(loggerMock.warn.mock.calls.length).toBe(0); // But it should not log any warnings.
    expect(loggerMock.error.mock.calls.length).toBe(0); // But it should not log any errors.
  });

  test('Should return false and log a warning if the SDK was not ready.', () => {
    const readinessManagerMock = { isReady: jest.fn(() => false), isReadyFromCache: jest.fn(() => false) };

    // @ts-ignore
    expect(validateIfOperational(loggerMock, readinessManagerMock, 'test_method')).toBe(false); // It should return true if SDK was ready.
    expect(readinessManagerMock.isReady.mock.calls.length).toBe(1); // It checks for SDK_READY status.
    expect(readinessManagerMock.isReadyFromCache.mock.calls.length).toBe(1); // It checks for SDK_READY_FROM_CACHE status.
    expect(loggerMock.warn.mock.calls).toEqual([['test_method: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.']]); // It should log the expected warning.
    expect(loggerMock.error.mock.calls.length).toBe(0); // But it should not log any errors.
  });
});
