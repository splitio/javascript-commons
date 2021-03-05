import { IPlatform } from '../sdkFactory/types';
import buildMetadata from '../utils/settingsValidation/buildMetadata';
import { ISettings } from '../types';
import { splitHttpClientFactory } from './splitHttpClient';
import { ISplitApi } from './types';
import { ISettingsInternal } from '../utils/settingsValidation/types';

function userKeyToQueryParam(userKey: string) {
  return 'users=' + encodeURIComponent(userKey); // no need to check availability of `encodeURIComponent`, since it is a global highly supported.
}

/**
 * Factory of SplitApi objects, which group the collection of Split HTTP endpoints used by the SDK
 *
 * @param settings validated settings object
 * @param platform environment-specific dependencies
 */
export function splitApiFactory(settings: ISettings, platform: IPlatform): ISplitApi {

  const urls = settings.urls;
  const filterQueryString = (settings as ISettingsInternal).sync.__splitFiltersValidation && (settings as ISettingsInternal).sync.__splitFiltersValidation.queryString;
  const metadata = buildMetadata(settings);
  const SplitSDKImpressionsMode = settings.sync.impressionsMode;
  const splitHttpClient = splitHttpClientFactory(settings.log, settings.core.authorizationKey, metadata, platform.getFetch, platform.getOptions);

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

    fetchSplitChanges(since: number) {
      const url = `${urls.sdk}/splitChanges?since=${since}${filterQueryString || ''}`;
      return splitHttpClient(url);
    },

    fetchSegmentChanges(since: number, segmentName: string) {
      const url = `${urls.sdk}/segmentChanges/${segmentName}?since=${since}`;
      return splitHttpClient(url);
    },

    fetchMySegments(userMatchingKey: string) {
      /**
       * URI encoding of user keys in order to:
       *  - avoid 400 responses (due to URI malformed). E.g.: '/api/mySegments/%'
       *  - avoid 404 responses. E.g.: '/api/mySegments/foo/bar'
       *  - match user keys with special characters. E.g.: 'foo%bar', 'foo/bar'
       */
      const url = `${urls.sdk}/mySegments/${encodeURIComponent(userMatchingKey)}`;
      return splitHttpClient(url);
    },

    postEventsBulk(body: string) {
      const url = `${urls.events}/events/bulk`;
      return splitHttpClient(url, 'POST', body);
    },

    postTestImpressionsBulk(body: string) {
      const url = `${urls.events}/testImpressions/bulk`;
      return splitHttpClient(url, 'POST', body, false, {
        // Adding extra headers to send impressions in OPTIMIZED or DEBUG modes.
        SplitSDKImpressionsMode
      });
    },

    postTestImpressionsCount(body: string) {
      const url = `${urls.events}/testImpressions/count`;
      return splitHttpClient(url, 'POST', body, true);
    },

    postMetricsCounters(body: string) {
      const url = `${urls.events}/metrics/counters`;
      return splitHttpClient(url, 'POST', body, true);
    },

    postMetricsTimes(body: string) {
      const url = `${urls.events}/metrics/times`;
      return splitHttpClient(url, 'POST', body);
    }
  };
}
