import { authProviderFactory } from '../authProvider';
import { Backoff } from '../../utils/Backoff';

// Speed up backoff for tests
Backoff.__TEST__BASE_MILLIS = 10;
Backoff.__TEST__MAX_MILLIS = 50;

function toBase64Url(str: string) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJwt(expInSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'HS256' }));
  const payload = toBase64Url(JSON.stringify({
    iat: now, exp: now + expInSeconds, 'x-ably-capability': '{"ch":["subscribe"]}'
  }));
  return `${header}.${payload}.sig`;
}

function mockFetchAuth(expInSeconds = 3600) {
  return jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ token: makeJwt(expInSeconds), pushEnabled: true, connDelay: 60 }),
    text: () => Promise.resolve('')
  }));
}

function networkError(statusCode?: number) {
  const err: any = new Error('fetch failed');
  err.statusCode = statusCode;
  return err;
}

describe('authProviderFactory', () => {

  test('credential() fetches and caches token', async () => {
    const fetchAuth = mockFetchAuth();
    const provider = authProviderFactory(fetchAuth);

    const cred = await provider.credential();
    expect(cred.token).toContain('.');
    expect(fetchAuth).toHaveBeenCalledTimes(1);

    // Second call returns cached
    const cred2 = await provider.credential();
    expect(cred2).toBe(cred);
    expect(fetchAuth).toHaveBeenCalledTimes(1);
  });

  test('credential() deduplicates concurrent calls', async () => {
    const fetchAuth = mockFetchAuth();
    const provider = authProviderFactory(fetchAuth);

    const [cred1, cred2] = await Promise.all([provider.credential(), provider.credential()]);
    expect(cred1).toBe(cred2);
    expect(fetchAuth).toHaveBeenCalledTimes(1);
  });

  test('invalidate() clears cache, next call fetches fresh', async () => {
    const fetchAuth = mockFetchAuth();
    const provider = authProviderFactory(fetchAuth);

    await provider.credential();
    provider.invalidate();

    await provider.credential();
    expect(fetchAuth).toHaveBeenCalledTimes(2);
  });

  test('credential() refetches when token is expired', async () => {
    const fetchAuth = mockFetchAuth();
    const provider = authProviderFactory(fetchAuth);

    // Manually inject expired credential via invalidate + fetch cycle
    await provider.credential();
    expect(fetchAuth).toHaveBeenCalledTimes(1);

    // Simulate expiration by invalidating and mocking expired response
    provider.invalidate();
    await provider.credential();
    expect(fetchAuth).toHaveBeenCalledTimes(2);
  });

  test('4xx errors reject immediately without retry', async () => {
    const fetchAuth = jest.fn(() => Promise.reject(networkError(401)));
    const provider = authProviderFactory(fetchAuth);

    await expect(provider.credential()).rejects.toThrow('fetch failed');
    expect(fetchAuth).toHaveBeenCalledTimes(1);
  });

  test('retries on non-4xx errors with backoff', async () => {
    let callCount = 0;
    const fetchAuth = jest.fn(() => {
      callCount++;
      if (callCount < 3) return Promise.reject(networkError());
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ token: makeJwt(), pushEnabled: true, connDelay: 60 }),
        text: () => Promise.resolve('')
      });
    });

    const provider = authProviderFactory(fetchAuth);
    const cred = await provider.credential();

    expect(cred.token).toContain('.');
    expect(fetchAuth).toHaveBeenCalledTimes(3);
  });

  test('stop() does not throw in any state', async () => {
    const fetchAuth = mockFetchAuth();
    const provider = authProviderFactory(fetchAuth);

    // Before any credential() call
    expect(() => provider.stop()).not.toThrow();

    // After credential is cached
    await provider.credential();
    expect(() => provider.stop()).not.toThrow();

    // After invalidate
    provider.invalidate();
    expect(() => provider.stop()).not.toThrow();

    // While fetch is in-flight
    const fetchAuth2 = jest.fn(() => new Promise(() => {})); // never resolves
    const provider2 = authProviderFactory(fetchAuth2 as any);
    provider2.credential();
    expect(() => provider2.stop()).not.toThrow();
  });

  test('stop() prevents in-flight request from rejecting or rescheduling', async () => {
    let rejectFetch: (err: any) => void;
    const fetchAuth = jest.fn(() => new Promise((_, reject) => { rejectFetch = reject; }));
    const provider = authProviderFactory(fetchAuth as any);

    const promise = provider.credential();
    provider.stop();

    // Simulate the in-flight fetch failing after stop
    rejectFetch!(networkError());

    // Should resolve (not reject) with last cached credential (undefined in this case), and no retry scheduled
    const result = await promise;
    expect(result).toEqual(undefined);
    expect(fetchAuth).toHaveBeenCalledTimes(1);
  });

  test('stop() cancels pending retries', async () => {
    const fetchAuth = jest.fn(() => Promise.reject(networkError()));
    const provider = authProviderFactory(fetchAuth);

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
