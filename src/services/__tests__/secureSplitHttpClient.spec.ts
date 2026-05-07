import { secureSplitHttpClientFactory } from '../secureSplitHttpClient';
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

const mockSettings = {
  core: { authorizationKey: 'sdk-key' },
  log: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  version: '1.0.0',
  runtime: {},
  sync: { requestOptions: undefined }
} as any;

function mockFetchAuth() {
  return jest.fn(() => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve({ token: makeJwt(), pushEnabled: true, connDelay: 60 }),
    text: () => Promise.resolve('')
  }));
}

function mockPlatform(fetchImpl: jest.Mock) {
  return { getFetch: () => fetchImpl, getOptions: () => undefined };
}

describe('secureSplitHttpClientFactory', () => {

  test('injects JWT Authorization header', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: true, status: 200 }));
    const fetchAuth = mockFetchAuth();
    const client = secureSplitHttpClientFactory(mockSettings, mockPlatform(fetchImpl), fetchAuth);

    await client('http://api/configs');

    const calls = fetchImpl.mock.calls as any[];
    const reqOpts = calls[calls.length - 1][1];
    expect(reqOpts.headers.Authorization).toMatch(/^Bearer .+\..+\..+$/);
  });

  test('retries once on 401 with fresh token', async () => {
    let configsCallCount = 0;
    const fetchImpl = jest.fn((url: string) => {
      if (url.includes('/configs')) {
        configsCallCount++;
        if (configsCallCount === 1) return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') });
      }
      return Promise.resolve({ ok: true, status: 200 });
    });
    const fetchAuth = mockFetchAuth();
    const client = secureSplitHttpClientFactory(mockSettings, mockPlatform(fetchImpl), fetchAuth);

    await client('http://api/configs');

    // fetchAuth called twice (initial + after invalidation)
    expect(fetchAuth).toHaveBeenCalledTimes(2);
    expect(configsCallCount).toBe(2);
  });

  test('does not retry on non-401 errors', async () => {
    const fetchImpl = jest.fn((url: string) => {
      if (url.includes('/configs')) return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('Server Error') });
      return Promise.resolve({ ok: true, status: 200 });
    });
    const fetchAuth = mockFetchAuth();
    const client = secureSplitHttpClientFactory(mockSettings, mockPlatform(fetchImpl), fetchAuth);

    await expect(client('http://api/configs')).rejects.toThrow();
    expect(fetchAuth).toHaveBeenCalledTimes(1);
  });
});
