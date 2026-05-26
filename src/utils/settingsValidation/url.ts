import { ISettings } from '../../types';

const telemetryEndpointMatcher = /^\/v1\/(metrics|keys)\/(config|usage|ss|cs)/;
const eventsEndpointMatcher = /^\/(testImpressions|metrics|events)/;
const authEndpointMatcher = /^\/(v2|v3)\/auth/;
const streamingEndpointMatcher = /^\/(sse|event-stream)/;
const configsEndpointMatcher = /^\/v1\/(configs|segmentChanges)/;

/**
 * Get URL based on a given target (path).
 * ATM, it is only used for testing purposes.
 *
 * @param settings - settings object
 * @param target - url path
 * @returns complete url
 */
export function url(settings: ISettings, target: string) {
  if (telemetryEndpointMatcher.test(target)) {
    return `${settings.urls.telemetry}${target}`;
  }
  if (eventsEndpointMatcher.test(target)) {
    return `${settings.urls.events}${target}`;
  }
  if (authEndpointMatcher.test(target)) {
    return `${settings.urls.auth}${target}`;
  }
  if (streamingEndpointMatcher.test(target)) {
    return `${settings.urls.streaming}${target}`;
  }
  if (configsEndpointMatcher.test(target)) {
    return `${settings.urls.configs}${target}`;
  }
  return `${settings.urls.sdk}${target}`;
}
