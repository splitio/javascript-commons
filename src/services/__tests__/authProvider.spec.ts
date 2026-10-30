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
    // Before any credential() call
    const providerBeforeAnyCall = authProviderFactory(mockSettings, mockSplitHttpClient(), mockTelemetryTracker);
    expect(() => providerBeforeAnyCall.stop()).not.toThrow();

    // After credential is cached
    const provider = authProviderFactory(mockSettings, mockSplitHttpClient(), mockTelemetryTracker);
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

  test('credential() rejects after stop() when there is no cached credential, without making a request', async () => {
    const splitHttpClient = jest.fn(() => Promise.reject(networkError()));
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    provider.stop();

    await expect(provider.credential()).rejects.toThrow();
    expect(splitHttpClient).not.toHaveBeenCalled();
  });

  test('stop() prevents in-flight request from rescheduling, and rejects it if there is no cached credential', async () => {
    let rejectFetch: (err: any) => void;
    const splitHttpClient = jest.fn(() => new Promise((_, reject) => { rejectFetch = reject; }));
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const promise = provider.credential();
    provider.stop();

    // Simulate the in-flight fetch failing after stop
    rejectFetch!(networkError());

    // Should reject (no cached credential to fall back to) and not reschedule a retry
    await expect(promise).rejects.toThrow();
    expect(splitHttpClient).toHaveBeenCalledTimes(1);
  });

  test('stop() prevents in-flight request from rescheduling, and falls back to the cached credential if there is one', async () => {
    let callCount = 0;
    let rejectFetch: (err: any) => void;
    const splitHttpClient = jest.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(makeJwtCredential(-1)), // already-expired token
        text: () => Promise.resolve('')
      });
      return new Promise((_, reject) => { rejectFetch = reject; });
    });
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const staleCred = await provider.credential();
    const promise = provider.credential(); // expired: triggers a refetch
    provider.stop();

    // Simulate the refetch failing after stop
    rejectFetch!(networkError());

    const result = await promise;
    expect(result).toEqual(staleCred);
    expect(splitHttpClient).toHaveBeenCalledTimes(2);
  });

  test('credential() reuses an in-flight fetch started before stop(), instead of firing a redundant one', async () => {
    let resolveFetch: (res: any) => void;
    const splitHttpClient = jest.fn(() => new Promise(resolve => { resolveFetch = resolve; }));
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const promiseBeforeStop = provider.credential();
    provider.stop();
    const promiseAfterStop = provider.credential(); // no cached credential yet, but a fetch is already in flight

    resolveFetch!({
      ok: true, status: 200,
      json: () => Promise.resolve(makeJwtCredential()),
      text: () => Promise.resolve('')
    });

    const [credBeforeStop, credAfterStop] = await Promise.all([promiseBeforeStop, promiseAfterStop]);
    expect(credAfterStop).toBe(credBeforeStop);
    expect(splitHttpClient).toHaveBeenCalledTimes(1);
  });

  test('credential() refetches once after stop() when cached credential is expired', async () => {
    let callCount = 0;
    const splitHttpClient = jest.fn(() => {
      callCount++;
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(makeJwtCredential(callCount === 1 ? -1 : 3600)),
        text: () => Promise.resolve('')
      });
    });
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const staleCred = await provider.credential(); // caches an already-expired token
    expect(splitHttpClient).toHaveBeenCalledTimes(1);

    provider.stop();

    const cred = await provider.credential();
    expect(cred).not.toEqual(staleCred);
    expect(splitHttpClient).toHaveBeenCalledTimes(2);
  });

  test('credential() falls back to stale cached credential if the last refetch after stop() fails', async () => {
    let callCount = 0;
    const splitHttpClient = jest.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(makeJwtCredential(-1)), // already-expired token
        text: () => Promise.resolve('')
      });
      return Promise.reject(networkError());
    });
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const staleCred = await provider.credential();
    provider.stop();

    const cred = await provider.credential();
    expect(cred).toEqual(staleCred);
    expect(splitHttpClient).toHaveBeenCalledTimes(2);
  });

  test('stop() cancels pending retries', async () => {
    const splitHttpClient = jest.fn(() => Promise.reject(networkError()));
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const promise = provider.credential();
    // Let first fetch fail and backoff schedule
    await new Promise(r => setTimeout(r, 5));

    provider.stop();

    // Promise should settle immediately after stop (rejected: no cached credential), instead of hanging on the cleared timeout
    const result = await Promise.race([
      promise.then(() => 'resolved').catch(() => 'rejected'),
      new Promise(r => setTimeout(() => r('timeout'), 100))
    ]);
    expect(result).toBe('rejected');
  });

  test('stop() settles a pending (not yet in-flight) retry with the cached credential, if there is one', async () => {
    let callCount = 0;
    const splitHttpClient = jest.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(makeJwtCredential(-1)), // already-expired token
        text: () => Promise.resolve('')
      });
      return Promise.reject(networkError());
    });
    const provider = authProviderFactory(mockSettings, splitHttpClient as any, mockTelemetryTracker);

    const staleCred = await provider.credential();
    const promise = provider.credential(); // expired: triggers a refetch, which fails and schedules a retry
    await new Promise(r => setTimeout(r, 5)); // let the refetch fail and the retry get scheduled (not yet fired)

    provider.stop();

    const result = await promise;
    expect(result).toEqual(staleCred);
  });
});
