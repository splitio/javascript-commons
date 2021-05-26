import { IPlatform } from '../sdkFactory/types';
import { ISettings } from '../types';
import { splitHttpClientFactory } from './splitHttpClient';
import { ISplitApi } from './types';
import { ISettingsInternal } from '../utils/settingsValidation/types';
import objectAssign from 'object-assign';

const noCacheHeaderOptions = { headers: { 'Cache-Control': 'no-cache' } };

function userKeyToQueryParam(userKey: string) {
  return 'users=' + encodeURIComponent(userKey); // no need to check availability of `encodeURIComponent`, since it is a global highly supported.
}

/**
 * Factory of SplitApi objects, which group the collection of Split HTTP endpoints used by the SDK
 *
 * @param settings validated settings object
 * @param platform object containing environment-specific `getFetch` and `getOptions` dependencies
 */
export function splitApiFactory(settings: ISettings, platform: Pick<IPlatform, 'getFetch' | 'getOptions'>): ISplitApi {

  const urls = settings.urls;
  const filterQueryString = (settings as ISettingsInternal).sync.__splitFiltersValidation && (settings as ISettingsInternal).sync.__splitFiltersValidation.queryString;
  const SplitSDKImpressionsMode = settings.sync.impressionsMode;
  const splitHttpClient = splitHttpClientFactory(settings, platform.getFetch, platform.getOptions);

  return {
    fetchAuth(userMatchingKeys?: string[]) {
      let url = `${urls.auth}/auth`;
      if (userMatchingKeys) { // accounting the possibility that `userMatchingKeys` is undefined (server-side API)
        const queryParams = userMatchingKeys.map(userKeyToQueryParam).join('&');
        if (queryParams) // accounting the possibility that `userKeys` and thus `queryParams` are empty
          url += '?' + queryParams;
      }
      return splitHttpClient(url);
    },

    fetchSplitChanges(since: number, noCache?: boolean) {
      const url = `${urls.sdk}/splitChanges?since=${since}${filterQueryString || ''}`;
      return splitHttpClient(url, noCache ? noCacheHeaderOptions : undefined);
    },

    fetchSegmentChanges(since: number, segmentName: string, noCache?: boolean) {
      const url = `${urls.sdk}/segmentChanges/${segmentName}?since=${since}`;
      return splitHttpClient(url, noCache ? noCacheHeaderOptions : undefined);
    },

    fetchMySegments(userMatchingKey: string, noCache?: boolean) {
      /**
       * URI encoding of user keys in order to:
       *  - avoid 400 responses (due to URI malformed). E.g.: '/api/mySegments/%'
       *  - avoid 404 responses. E.g.: '/api/mySegments/foo/bar'
       *  - match user keys with special characters. E.g.: 'foo%bar', 'foo/bar'
       */
      const url = `${urls.sdk}/mySegments/${encodeURIComponent(userMatchingKey)}`;
      return splitHttpClient(url, noCache ? noCacheHeaderOptions : undefined);
    },

    postEventsBulk(body: string, headers?: Record<string, string>) {
      const url = `${urls.events}/events/bulk`;
      return splitHttpClient(url, { method: 'POST', body, headers });
    },

    postTestImpressionsBulk(body: string, headers?: Record<string, string>) {
      const url = `${urls.events}/testImpressions/bulk`;
      return splitHttpClient(url, {
        // Adding extra headers to send impressions in OPTIMIZED or DEBUG modes.
        method: 'POST', body, headers: objectAssign({ SplitSDKImpressionsMode }, headers)
      });
    },

    postTestImpressionsCount(body: string) {
      const url = `${urls.events}/testImpressions/count`;
      return splitHttpClient(url, { method: 'POST', body });
    },

    postMetricsCounters(body: string) {
      const url = `${urls.events}/metrics/counters`;
      return splitHttpClient(url, { method: 'POST', body }, true);
    },

    postMetricsTimes(body: string) {
      const url = `${urls.events}/metrics/times`;
      return splitHttpClient(url, { method: 'POST', body }, true);
    }
  };
}
