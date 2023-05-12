import { IPlatform } from '../sdkFactory/types';
import { ISettings } from '../types';
import { splitHttpClientFactory } from './splitHttpClient';
import { ISplitApi } from './types';
import { objectAssign } from '../utils/lang/objectAssign';
import { ITelemetryTracker } from '../trackers/types';
import { SPLITS, IMPRESSIONS, IMPRESSIONS_COUNT, EVENTS, TELEMETRY, TOKEN, SEGMENT, MY_SEGMENT } from '../utils/constants';

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
export function splitApiFactory(
  settings: Pick<ISettings, 'urls' | 'sync' | 'log' | 'version' | 'runtime' | 'core'>,
  platform: Pick<IPlatform, 'getFetch' | 'getOptions'>,
  telemetryTracker: ITelemetryTracker
): ISplitApi {

  const urls = settings.urls;
  const filterQueryString = settings.sync.__splitFiltersValidation && settings.sync.__splitFiltersValidation.queryString;
  const SplitSDKImpressionsMode = settings.sync.impressionsMode;
  const splitHttpClient = splitHttpClientFactory(settings, platform.getFetch, platform.getOptions);

  return {
    // @TODO throw errors if health check requests fail, to log them in the Synchronizer
    getSdkAPIHealthCheck() {
      const url = `${urls.sdk}/version`;
      return splitHttpClient(url).then(() => true).catch(() => false);
    },

    getEventsAPIHealthCheck() {
      const url = `${urls.events}/version`;
      return splitHttpClient(url).then(() => true).catch(() => false);
    },

    fetchAuth(userMatchingKeys?: string[]) {
      let url = `${urls.auth}/v2/auth`;
      if (userMatchingKeys) { // accounting the possibility that `userMatchingKeys` is undefined (server-side API)
        const queryParams = userMatchingKeys.map(userKeyToQueryParam).join('&');
        if (queryParams) // accounting the possibility that `userKeys` and thus `queryParams` are empty
          url += '?' + queryParams;
      }
      return splitHttpClient(url, undefined, telemetryTracker.trackHttp(TOKEN));
    },

    fetchSplitChanges(since: number, noCache?: boolean, till?: number) {
      const url = `${urls.sdk}/splitChanges?since=${since}${till ? '&till=' + till : ''}${filterQueryString || ''}`;
      return splitHttpClient(url, noCache ? noCacheHeaderOptions : undefined, telemetryTracker.trackHttp(SPLITS));
    },

    fetchSegmentChanges(since: number, segmentName: string, noCache?: boolean, till?: number) {
      const url = `${urls.sdk}/segmentChanges/${segmentName}?since=${since}${till ? '&till=' + till : ''}`;
      return splitHttpClient(url, noCache ? noCacheHeaderOptions : undefined, telemetryTracker.trackHttp(SEGMENT));
    },

    fetchMySegments(userMatchingKey: string, noCache?: boolean) {
      /**
       * URI encoding of user keys in order to:
       *  - avoid 400 responses (due to URI malformed). E.g.: '/api/mySegments/%'
       *  - avoid 404 responses. E.g.: '/api/mySegments/foo/bar'
       *  - match user keys with special characters. E.g.: 'foo%bar', 'foo/bar'
       */
      const url = `${urls.sdk}/mySegments/${encodeURIComponent(userMatchingKey)}`;
      return splitHttpClient(url, noCache ? noCacheHeaderOptions : undefined, telemetryTracker.trackHttp(MY_SEGMENT));
    },

    /**
     * Post events.
     *
     * @param body  Events bulk payload
     * @param headers  Optionals headers to overwrite default ones. For example, it is used in producer mode to overwrite metadata headers.
     */
    postEventsBulk(body: string, headers?: Record<string, string>) {
      const url = `${urls.events}/events/bulk`;
      return splitHttpClient(url, { method: 'POST', body, headers }, telemetryTracker.trackHttp(EVENTS));
    },

    /**
     * Post impressions.
     *
     * @param body  Impressions bulk payload
     * @param headers  Optionals headers to overwrite default ones. For example, it is used in producer mode to overwrite metadata headers.
     */
    postTestImpressionsBulk(body: string, headers?: Record<string, string>) {
      const url = `${urls.events}/testImpressions/bulk`;
      return splitHttpClient(url, {
        // Adding extra headers to send impressions in OPTIMIZED or DEBUG modes.
        method: 'POST', body, headers: objectAssign({ SplitSDKImpressionsMode }, headers)
      }, telemetryTracker.trackHttp(IMPRESSIONS));
    },

    /**
     * Post impressions counts.
     *
     * @param body  Impressions counts payload
     * @param headers  Optionals headers to overwrite default ones. For example, it is used in producer mode to overwrite metadata headers.
     */
    postTestImpressionsCount(body: string, headers?: Record<string, string>) {
      const url = `${urls.events}/testImpressions/count`;
      return splitHttpClient(url, { method: 'POST', body, headers }, telemetryTracker.trackHttp(IMPRESSIONS_COUNT));
    },

    /**
     * Post unique keys for client side.
     *
     * @param body  unique keys payload
     * @param headers  Optionals headers to overwrite default ones. For example, it is used in producer mode to overwrite metadata headers.
     */
    postUniqueKeysBulkCs(body: string, headers?: Record<string, string>) {
      const url = `${urls.telemetry}/v1/keys/cs`;
      return splitHttpClient(url, { method: 'POST', body, headers }, telemetryTracker.trackHttp(TELEMETRY));
    },

    /**
     * Post unique keys for server side.
     *
     * @param body  unique keys payload
     * @param headers  Optionals headers to overwrite default ones. For example, it is used in producer mode to overwrite metadata headers.
     */
    postUniqueKeysBulkSs(body: string, headers?: Record<string, string>) {
      const url = `${urls.telemetry}/v1/keys/ss`;
      return splitHttpClient(url, { method: 'POST', body, headers }, telemetryTracker.trackHttp(TELEMETRY));
    },

    postMetricsConfig(body: string, headers?: Record<string, string>) {
      const url = `${urls.telemetry}/v1/metrics/config`;
      return splitHttpClient(url, { method: 'POST', body, headers }, telemetryTracker.trackHttp(TELEMETRY), true);
    },

    postMetricsUsage(body: string, headers?: Record<string, string>) {
      const url = `${urls.telemetry}/v1/metrics/usage`;
      return splitHttpClient(url, { method: 'POST', body, headers }, telemetryTracker.trackHttp(TELEMETRY), true);
    }
  };
}
