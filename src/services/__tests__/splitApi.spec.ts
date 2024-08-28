// @ts-nocheck
import { splitApiFactory } from '../splitApi';
import { ISettings } from '../../types';
import { settingsSplitApi } from '../../utils/settingsValidation/__tests__/settings.mocks';

const settingsWithRuntime = { ...settingsSplitApi, runtime: { ip: 'ip', hostname: 'hostname' } } as ISettings;
const settingsWithSets = { ...settingsSplitApi, validateFilters: true, sync: { __splitFiltersValidation: { queryString: '&testFlagQueryString' }, flagSpecVersion: '1.1' } } as ISettings;

const telemetryTrackerMock = { trackHttp: jest.fn(() => () => { }) };

function assertHeaders(settings: ISettings, headers: Record<string, string>) {
  expect(headers['Accept']).toBe('application/json');
  expect(headers['Content-Type']).toBe('application/json');
  expect(headers['Authorization']).toBe(`Bearer ${settings.core.authorizationKey}`);
  expect(headers['SplitSDKVersion']).toBe(settings.version);

  if (settings.runtime && settings.runtime.ip) expect(headers['SplitSDKMachineIP']).toBe(settings.runtime.ip);
  if (settings.runtime && settings.runtime.hostname) expect(headers['SplitSDKMachineName']).toBe(settings.runtime.hostname);
}

describe('splitApi', () => {

  test.each([settingsSplitApi, settingsWithRuntime, settingsWithSets])('performs requests with expected headers', (settings) => {

    const fetchMock = jest.fn(() => Promise.resolve({ ok: true }));
    const splitApi = splitApiFactory(settings, { getFetch: () => fetchMock }, telemetryTrackerMock);

    splitApi.fetchAuth(['key1', 'key2']);
    let [url, { headers }] = fetchMock.mock.calls[0];
    assertHeaders(settings, headers);
    expect(url).toBe('auth/v2/auth?s=1.1&users=key1&users=key2');

    splitApi.fetchMemberships('userKey');
    [url, { headers }] = fetchMock.mock.calls[1];
    assertHeaders(settings, headers);
    expect(url).toBe('sdk/memberships/userKey');

    splitApi.fetchSegmentChanges(-1, 'segmentName', false, 90);
    [url, { headers }] = fetchMock.mock.calls[2];
    assertHeaders(settings, headers);
    expect(url).toBe('sdk/segmentChanges/segmentName?since=-1&till=90');

    splitApi.fetchSplitChanges(-1, false, 100);
    [url, { headers }] = fetchMock.mock.calls[3];
    assertHeaders(settings, headers);
    expect(url).toBe(expecteFlagsUrl(-1, 100, settings.validateFilters || false, settings));

    splitApi.postEventsBulk('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[4][1].headers);

    splitApi.postTestImpressionsBulk('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[5][1].headers);
    expect(fetchMock.mock.calls[5][1].headers['SplitSDKImpressionsMode']).toBe(settings.sync.impressionsMode);

    splitApi.postTestImpressionsCount('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[6][1].headers);

    splitApi.postMetricsConfig('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[7][1].headers);
    splitApi.postMetricsUsage('fake-body');
    assertHeaders(settings, fetchMock.mock.calls[8][1].headers);

    expect(telemetryTrackerMock.trackHttp).toBeCalledTimes(9);

    telemetryTrackerMock.trackHttp.mockClear();
    fetchMock.mockClear();


    function expecteFlagsUrl(since: number, till: number, usesFilter: boolean, settings: ISettings) {
      const filterQueryString = settings.sync.__splitFiltersValidation && settings.sync.__splitFiltersValidation.queryString;
      return `sdk/splitChanges?s=1.1&since=${since}${usesFilter ? filterQueryString : ''}${till ? '&till=' + till : ''}`;
    }
  });

  test('rejects requests if fetch Api is not provided', (done) => {

    const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => undefined }, telemetryTrackerMock);

    // Invoking any Service method, returns a rejected promise with Split error
    splitApi.fetchAuth().catch(error => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Global fetch API is not available.');
      done();
    });

  });

  test('performs requests with overwritten headers', () => {
    const fetchMock = jest.fn(() => Promise.resolve({ ok: true }));
    const splitApi = splitApiFactory(settingsWithRuntime, { getFetch: () => fetchMock }, telemetryTrackerMock);

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
    const splitApi = splitApiFactory(settingsWithRuntime, { getFetch: () => fetchMock }, telemetryTrackerMock);

    splitApi.getSdkAPIHealthCheck().then((res) => {
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
