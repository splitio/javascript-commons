import { startsWith } from '../utils/lang';

const everythingAtTheEnd = /[^.]+$/;

const DEFAULT_PREFIX = 'SPLITIO';

export function validatePrefix(prefix: unknown) {
  return prefix ? prefix + '.SPLITIO' : 'SPLITIO';
}

export class KeyBuilder {

  protected readonly prefix: string;

  constructor(prefix: string = DEFAULT_PREFIX) {
    this.prefix = prefix;
  }

  buildTrafficTypeKey(trafficType: string) {
    return `${this.prefix}.trafficType.${trafficType}`;
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

}
