import { secureSplitHttpClientFactory } from '../secureSplitHttpClient';
import { Backoff } from '../../utils/Backoff';
import { makeJwtCredential } from '../../__tests__/testUtils/jwt';

// Speed up backoff for tests
Backoff.__TEST__BASE_MILLIS = 10;
Backoff.__TEST__MAX_MILLIS = 50;

const mockSettings = {
  core: { authorizationKey: 'sdk-key' },
  log: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  version: '1.0.0',
  runtime: {},
  urls: { auth: 'https://auth.split.io/api' },
  sync: { requestOptions: undefined }
} as any;

const mockTelemetryTracker = { trackHttp: jest.fn(() => jest.fn()) } as any;


const authResponse = { ok: true, status: 200, json: () => Promise.resolve(makeJwtCredential()), text: () => Promise.resolve('') };

function createSecureSplitHttpClient(configsHandler: (callCount: number) => any) {
  let configsCallCount = 0;
  const fetchImpl = jest.fn((url: string) => {
    if (url.includes('/auth')) return Promise.resolve(authResponse);
    configsCallCount++;
    return configsHandler(configsCallCount);
  });
  const client = secureSplitHttpClientFactory(mockSettings, { getFetch: () => fetchImpl, getOptions: () => undefined }, mockTelemetryTracker);
  return { client, fetchImpl };
}

describe('secureSplitHttpClientFactory', () => {

  test('injects JWT Authorization header', async () => {
    const { client, fetchImpl } = createSecureSplitHttpClient(() => Promise.resolve({ ok: true, status: 200 }));

    await client('http://api/configs');

    const calls = fetchImpl.mock.calls as any[];
    const configsCall = calls.find(c => c[0].includes('/configs'));
    expect(configsCall[1].headers.Authorization).toMatch(/^Bearer .+\..+\..+$/);
  });

  test('retries once on 401 with fresh token', async () => {
    const { client, fetchImpl } = createSecureSplitHttpClient((count) => {
      if (count === 1) return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') });
      return Promise.resolve({ ok: true, status: 200 });
    });

    await client('http://api/configs');

    const authCalls = (fetchImpl.mock.calls as any[]).filter(c => c[0].includes('/auth'));
    expect(authCalls.length).toBe(2);
  });

  test('does not retry on non-401 errors', async () => {
    const { client, fetchImpl } = createSecureSplitHttpClient(() => Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('Server Error') }));

    await expect(client('http://api/configs')).rejects.toThrow();
    const authCalls = (fetchImpl.mock.calls as any[]).filter(c => c[0].includes('/auth'));
    expect(authCalls.length).toBe(1);
  });
});
