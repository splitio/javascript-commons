// @ts-nocheck
import { splitApiFactory } from '../splitApi';
import { ISettings } from '../../types';
import { settingsSplitApi } from '../../utils/settingsValidation/__tests__/settings.mocks';

const settingsWithRuntime = { ...settingsSplitApi, runtime: { ip: 'ip', hostname: 'hostname' } } as ISettings;

function assertHeaders(settings: ISettings, headers: Record<string, string>) {
  expect(headers['Accept']).toBe('application/json');
  expect(headers['Content-Type']).toBe('application/json');
  expect(headers['Authorization']).toBe(`Bearer ${settings.core.authorizationKey}`);
  expect(headers['SplitSDKVersion']).toBe(settings.version);

  if (settings.runtime && settings.runtime.ip) expect(headers['SplitSDKMachineIP']).toBe(settings.runtime.ip);
  if (settings.runtime && settings.runtime.hostname) expect(headers['SplitSDKMachineName']).toBe(settings.runtime.hostname);
}

describe('splitApi', () => {

  test.each([settingsSplitApi, settingsWithRuntime])('performs requests with expected headers', (settings) => {

    const fetchMock = jest.fn(() => Promise.resolve({ ok: true }));
    const splitApi = splitApiFactory(settings, { getFetch: () => fetchMock });

    splitApi.fetchAuth();
    assertHeaders(settings, fetchMock.mock.calls[0][1].headers);

    splitApi.fetchMySegments('userKey');
    assertHeaders(settings, fetchMock.mock.calls[1][1].headers);

    splitApi.fetchSegmentChanges(-1, 'segmentName');
    assertHeaders(settings, fetchMock.mock.calls[2][1].headers);

    splitApi.fetchSplitChanges(-1);
    assertHeaders(settings, fetchMock.mock.calls[3][1].headers);

    splitApi.postEventsBulk('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[4][1].headers);

    splitApi.postTestImpressionsBulk('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[5][1].headers);
    expect(fetchMock.mock.calls[5][1].headers['SplitSDKImpressionsMode']).toBe(settings.sync.impressionsMode);

    splitApi.postTestImpressionsCount('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[6][1].headers);

    // Deprecated
    splitApi.postMetricsCounters('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[7][1].headers);
    splitApi.postMetricsTimes('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[8][1].headers);

    fetchMock.mockClear();
  });

  test('rejects requests if fetch Api is not provided', (done) => {

    const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => undefined });

    // Invoking any Service method, returns a rejected promise with Split error
    splitApi.fetchAuth().catch(error => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Global fetch API is not available.');
      done();
    });

  });

  test('performs requests with overwritten headers', () => {
    const fetchMock = jest.fn(() => Promise.resolve({ ok: true }));
    const splitApi = splitApiFactory(settingsWithRuntime, { getFetch: () => fetchMock });

    const newHeaders = { SplitSDKVersion: 'newVersion', SplitSDKMachineIP: 'newIp', SplitSDKMachineName: 'newHostname' };
    const expectedHeaders = { ...settingsWithRuntime, version: newHeaders.SplitSDKVersion, runtime: { ip: newHeaders.SplitSDKMachineIP, hostname: newHeaders.SplitSDKMachineName } };

    splitApi.postEventsBulk('fake-body', newHeaders);
    assertHeaders(expectedHeaders, fetchMock.mock.calls[0][1].headers);

    splitApi.postTestImpressionsBulk('fake-body', newHeaders);
    assertHeaders(expectedHeaders, fetchMock.mock.calls[1][1].headers);
    expect(fetchMock.mock.calls[1][1].headers['SplitSDKImpressionsMode']).toBe(settingsWithRuntime.sync.impressionsMode);
  });

  test('performs APIs health service check', (done) => {
    const fetchMock = jest.fn(() => Promise.resolve({ ok: true }));
    const splitApi = splitApiFactory(settingsWithRuntime, { getFetch: () => fetchMock });

    splitApi.getSplitAPIHealthCheck().then((res) => {
      expect(res).toEqual(true);
    });
    expect(fetchMock.mock.calls[0][0]).toMatch('sdk/version');

    splitApi.getEventsAPIHealthCheck().then((res) => {
      expect(res).toEqual(true);
      done();
    });
    expect(fetchMock.mock.calls[1][0]).toMatch('events/version');
  });
});
