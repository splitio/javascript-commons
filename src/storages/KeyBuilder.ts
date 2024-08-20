import { ISettings } from '../types';
import { startsWith } from '../utils/lang';
import { hash } from '../utils/murmur3/murmur3';

const everythingAtTheEnd = /[^.]+$/;

const DEFAULT_PREFIX = 'SPLITIO';

export function validatePrefix(prefix: unknown) {
  return prefix ? prefix + '.SPLITIO' : 'SPLITIO';
}

export class KeyBuilder {

  readonly prefix: string;

  constructor(prefix: string = DEFAULT_PREFIX) {
    this.prefix = prefix;
  }

  buildTrafficTypeKey(trafficType: string) {
    return `${this.prefix}.trafficType.${trafficType}`;
  }

  buildFlagSetKey(flagSet: string) {
    return `${this.prefix}.flagSet.${flagSet}`;
  }

  buildSplitKey(splitName: string) {
    return `${this.prefix}.split.${splitName}`;
  }

  buildSplitsTillKey() {
    return `${this.prefix}.splits.till`;
  }

  // NOT USED
  // buildSplitsReady() {
  //   return `${this.prefix}.splits.ready`;
  // }

  isSplitKey(key: string) {
    return startsWith(key, `${this.prefix}.split.`);
  }

  buildSplitKeyPrefix() {
    return `${this.prefix}.split.`;
  }

  // Only used by InLocalStorage.
  buildSplitsWithSegmentCountKey() {
    return `${this.prefix}.splits.usingSegments`;
  }

  buildSegmentNameKey(segmentName: string) {
    return `${this.prefix}.segment.${segmentName}`;
  }

  buildSegmentTillKey(segmentName: string) {
    return `${this.prefix}.segment.${segmentName}.till`;
  }

  // NOT USED
  // buildSegmentsReady() {
  //   return `${this.prefix}.segments.ready`;
  // }

  extractKey(builtKey: string) {
    const s = builtKey.match(everythingAtTheEnd);

    if (s && s.length) {
      return s[0];
    } else {
      throw new Error('Invalid latency key provided');
    }
  }

  buildHashKey() {
    return `${this.prefix}.hash`;
  }
}

/**
 * Generates a murmur32 hash based on the authorization key, the feature flags filter query, and version of SplitChanges API.
 * The hash is in hexadecimal format (8 characters max, 32 bits).
 */
export function getStorageHash(settings: ISettings) {
  return hash(`${settings.core.authorizationKey}::${settings.sync.__splitFiltersValidation.queryString}::${settings.sync.flagSpecVersion}`).toString(16);
}
