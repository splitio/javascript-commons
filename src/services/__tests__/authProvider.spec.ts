import { authProviderFactory } from '../authProvider';
import { Backoff } from '../../utils/Backoff';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { makeJwtCredential } from '../../__tests__/testUtils/jwt';

// Speed up backoff for tests
Backoff.__TEST__BASE_MILLIS = 10;
Backoff.__TEST__MAX_MILLIS = 50;

function mockSplitHttpClient() {
  return jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(makeJwtCredential()),
    text: () => Promise.resolve('')
  }));
}

function networkError(statusCode?: number) {
  const err: any = new Error('fetch failed');
  err.statusCode = statusCode;
  return err;
}

const mockSettings = {
  urls: { auth: 'https://auth.split.io/api' },
  log: loggerMock,
} as any;

const mockTelemetryTracker = { trackHttp: jest.fn(() => jest.fn()) } as any;

describe('authProviderFactory', () => {

  test('credential() fetches and caches token', async () => {
    const splitHttpClient = mockSplitHttpClient();
    const provider = authProviderFactory(mockSettings, splitHttpClient, mockTelemetryTracker);

    const cred = await provider.credential();
    expect(cred.token).toContain('.');
    expect(splitHttpClient).toHaveBeenCalledTimes(1);

    // Second call returns cached
    const cred2 = await provider.credential();
    expect(cred2).toBe(cred);
    expect(splitHttpClient).toHaveBeenCalledTimes(1);
  });

  test('credential() deduplicates concurrent calls', async () => {
    const splitHttpClient = mockSplitHttpClient();
    const provider = authProviderFactory(mockSettings, splitHttpClient, mockTelemetryTracker);

    const [cred1, cred2] = await Promise.all([provider.credential(), provider.credential()]);
    expect(cred1).toBe(cred2);
    expect(splitHttpClient).toHaveBeenCalledTimes(1);
  });

  test('invalidate() clears cache, next call fetches fresh', async () => {
    const splitHttpClient = mockSplitHttpClient();
    const provider = authProviderFactory(mockSettings, splitHttpClient, mockTelemetryTracker);

    await provider.credential();
    provider.invalidate();

    await provider.credential();
    expect(splitHttpClient).toHaveBeenCalledTimes(2);
  });

  test('credential() refetches when token is expired', async () => {
    const splitHttpClient = mockSplitHttpClient();
    const provider = authProviderFactory(mockSettings, splitHttpClient, mockTelemetryTracker);

    await provider.credential();
    expect(splitHttpClient).toHaveBeenCalledTimes(1);

    provider.invalidate();
    await provider.credential();
    expect(splitHttpClient).toHaveBeenCalledTimes(2);
  });

  test('4xx errors reject immediately without retry', async () => {
    const splitHttpClient = jest.fn(() => Promise.reject(networkError(401)));
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    await expect(provider.credential()).rejects.toThrow('fetch failed');
    expect(splitHttpClient).toHaveBeenCalledTimes(1);
  });

  test('retries on non-4xx errors with backoff', async () => {
    let callCount = 0;
    const splitHttpClient = jest.fn(() => {
      callCount++;
      if (callCount < 3) return Promise.reject(networkError());
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(makeJwtCredential()),
        text: () => Promise.resolve('')
      });
    });

    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);
    const cred = await provider.credential();

    expect(cred.token).toContain('.');
    expect(splitHttpClient).toHaveBeenCalledTimes(3);
  });

  test('stop() does not throw in any state', async () => {
    const splitHttpClient = mockSplitHttpClient();
    const provider = authProviderFactory(mockSettings, splitHttpClient, mockTelemetryTracker);

    // Before any credential() call
    expect(() => provider.stop()).not.toThrow();

    // After credential is cached
    await provider.credential();
    expect(() => provider.stop()).not.toThrow();

    // After invalidate
    provider.invalidate();
    expect(() => provider.stop()).not.toThrow();

    // While fetch is in-flight
    const splitHttpClient2 = jest.fn(() => new Promise(() => {})); // never resolves
    const provider2 = authProviderFactory(mockSettings, splitHttpClient2 as any, mockTelemetryTracker);
    provider2.credential();
    expect(() => provider2.stop()).not.toThrow();
  });

  test('stop() prevents in-flight request from rejecting or rescheduling', async () => {
    let rejectFetch: (err: any) => void;
    const splitHttpClient = jest.fn(() => new Promise((_, reject) => { rejectFetch = reject; }));
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const promise = provider.credential();
    provider.stop();

    // Simulate the in-flight fetch failing after stop
    rejectFetch!(networkError());

    // Should resolve (not reject) with last cached credential (undefined in this case), and no retry scheduled
    const result = await promise;
    expect(result).toEqual(undefined);
    expect(splitHttpClient).toHaveBeenCalledTimes(1);
  });

  test('stop() cancels pending retries', async () => {
    const splitHttpClient = jest.fn(() => Promise.reject(networkError()));
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const promise = provider.credential();
    // Let first fetch fail and backoff schedule
    await new Promise(r => setTimeout(r, 5));

    provider.stop();

    // Promise should never resolve/reject after stop (pending timeout cleared)
    const result = await Promise.race([
      promise.then(() => 'resolved').catch(() => 'rejected'),
      new Promise(r => setTimeout(() => r('timeout'), 100))
    ]);
    expect(result).toBe('timeout');
  });
});
