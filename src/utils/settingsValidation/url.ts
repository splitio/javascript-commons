import { ISettings } from '../../types';

const telemetryEndpointMatcher = /^\/v1\/metrics\/(config|usage)/;
const eventsEndpointMatcher = /^\/(testImpressions|metrics|events)/;
const authEndpointMatcher = /^\/v2\/auth/;
const streamingEndpointMatcher = /^\/(sse|event-stream)/;

/**
 * Get URL based on a given target (path).
 * ATM, it is only used for testing purposes.
 *
 * @param settings settings object
 * @param target url path
 * @return complete url
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
  return `${settings.urls.sdk}${target}`;
}
