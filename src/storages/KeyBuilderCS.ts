import { startsWith } from '../utils/lang';
import { KeyBuilder } from './KeyBuilder';

export interface MySegmentsKeyBuilder {
  buildSegmentNameKey(segmentName: string): string;
  extractSegmentName(builtSegmentKeyName: string): string | undefined;
  extractOldSegmentKey(builtSegmentKeyName: string): string | undefined;
  buildTillKey(): string;
}

export class KeyBuilderCS extends KeyBuilder implements MySegmentsKeyBuilder {

  protected readonly regexSplitsCacheKey: RegExp;
  protected readonly matchingKey: string;

  constructor(prefix: string, matchingKey: string) {
    super(prefix);
    this.matchingKey = matchingKey;
    this.regexSplitsCacheKey = new RegExp(`^${prefix}\\.(splits?|trafficType|flagSet)\\.`);
  }

  /**
   * @override
   */
  buildSegmentNameKey(segmentName: string) {
    return `${this.prefix}.${this.matchingKey}.segment.${segmentName}`;
  }

  extractSegmentName(builtSegmentKeyName: string) {
    const prefix = `${this.prefix}.${this.matchingKey}.segment.`;

    if (startsWith(builtSegmentKeyName, prefix))
      return builtSegmentKeyName.substr(prefix.length);
  }

  // @BREAKING: The key used to start with the matching key instead of the prefix, this was changed on version 10.17.3
  extractOldSegmentKey(builtSegmentKeyName: string) {
    const prefix = `${this.matchingKey}.${this.prefix}.segment.`;

    if (startsWith(builtSegmentKeyName, prefix))
      return builtSegmentKeyName.substr(prefix.length);
  }

  buildLastUpdatedKey() {
    return `${this.prefix}.splits.lastUpdated`;
  }

  isSplitsCacheKey(key: string) {
    return this.regexSplitsCacheKey.test(key);
  }

  buildTillKey() {
    return `${this.prefix}.${this.matchingKey}.segments.till`;
  }
}

export function myLargeSegmentsKeyBuilder(prefix: string, matchingKey: string): MySegmentsKeyBuilder {
  return {
    buildSegmentNameKey(segmentName: string) {
      return `${prefix}.${matchingKey}.largeSegment.${segmentName}`;
    },

    extractSegmentName(builtSegmentKeyName: string) {
      const p = `${prefix}.${matchingKey}.largeSegment.`;

      if (startsWith(builtSegmentKeyName, p)) return builtSegmentKeyName.substr(p.length);
    },

    extractOldSegmentKey() {
      return undefined;
    },

    buildTillKey() {
      return `${prefix}.${matchingKey}.largeSegments.till`;
    }
  };
}
