import { ISettings } from '../types';
import { hash } from '../utils/murmur3/murmur3';

const everythingAtTheEnd = /[^.]+$/;

const DEFAULT_PREFIX = 'SPLITIO';

/**
 * Builds the key prefix used by every storage.
 *
 * The SDK's own `SPLITIO` segment is always appended to the value you supply,
 * so a prefix of `myApp` produces keys of the form `myApp.SPLITIO.split.<name>`
 * — the custom part comes first, not last.
 *
 * Note that `SPLITIO` is not implied: passing it explicitly produces
 * `SPLITIO.SPLITIO.split.<name>`. A producer and a consumer configured that
 * way still agree with each other, but one configured with `SPLITIO` and one
 * with no prefix at all do not, and the symptom is silent — every evaluation
 * returns `control`, since the reader simply finds nothing under its own keys.
 *
 * @param prefix - custom prefix, or a falsy value for none
 * @returns the full key prefix
 */
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

  buildSetKey(set: string) {
    return `${this.prefix}.flagSet.${set}`;
  }

  buildDefinitionKey(definitionName: string) {
    return `${this.prefix}.split.${definitionName}`;
  }

  buildDefinitionsTillKey() {
    return `${this.prefix}.splits.till`;
  }

  buildDefinitionKeyPrefix() {
    return `${this.prefix}.split.`;
  }

  buildRBSegmentKey(rbsegmentName: string) {
    return `${this.prefix}.rbsegment.${rbsegmentName}`;
  }

  buildRBSegmentsTillKey() {
    return `${this.prefix}.rbsegments.till`;
  }

  buildRBSegmentKeyPrefix() {
    return `${this.prefix}.rbsegment.`;
  }

  buildSegmentNameKey(segmentName: string) {
    return `${this.prefix}.segment.${segmentName}`;
  }

  buildSegmentTillKey(segmentName: string) {
    return `${this.prefix}.segment.${segmentName}.till`;
  }

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
