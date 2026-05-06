import { startsWith } from '../utils/lang';
import { KeyBuilder } from './KeyBuilder';

export interface MySegmentsKeyBuilder {
  buildSegmentNameKey(segmentName: string): string;
  extractSegmentName(builtSegmentKeyName: string): string | undefined;
  buildTillKey(): string;
}

export class KeyBuilderCS extends KeyBuilder implements MySegmentsKeyBuilder {

  protected readonly regexDefinitionsCacheKey: RegExp;
  protected readonly matchingKey: string;

  constructor(prefix: string, matchingKey: string) {
    super(prefix);
    this.matchingKey = matchingKey;
    this.regexDefinitionsCacheKey = new RegExp(`^${prefix}\\.(splits?|trafficType|flagSet)\\.`);
  }

  /**
   * @override
   */
  buildSegmentNameKey(segmentName: string) {
    return `${this.prefix}.${this.matchingKey}.segment.${segmentName}`;
  }

  extractSegmentName(builtSegmentKeyName: string) {
    const prefix = `${this.prefix}.${this.matchingKey}.segment.`;

    if (startsWith(builtSegmentKeyName, prefix)) return builtSegmentKeyName.slice(prefix.length);
  }

  buildLastUpdatedKey() {
    return `${this.prefix}.splits.lastUpdated`;
  }

  isDefinitionsCacheKey(key: string) {
    return this.regexDefinitionsCacheKey.test(key);
  }

  buildTillKey() {
    return `${this.prefix}.${this.matchingKey}.segments.till`;
  }

  isDefinitionKey(key: string) {
    return startsWith(key, `${this.prefix}.split.`);
  }

  isRBSegmentKey(key: string) {
    return startsWith(key, `${this.prefix}.rbsegment.`);
  }

  buildDefinitionsWithSegmentCountKey() {
    return `${this.prefix}.splits.usingSegments`;
  }

  buildLastClear() {
    return `${this.prefix}.lastClear`;
  }
}

export function myLargeSegmentsKeyBuilder(prefix: string, matchingKey: string): MySegmentsKeyBuilder {
  return {
    buildSegmentNameKey(segmentName: string) {
      return `${prefix}.${matchingKey}.largeSegment.${segmentName}`;
    },

    extractSegmentName(builtSegmentKeyName: string) {
      const p = `${prefix}.${matchingKey}.largeSegment.`;

      if (startsWith(builtSegmentKeyName, p)) return builtSegmentKeyName.slice(p.length);
    },

    buildTillKey() {
      return `${prefix}.${matchingKey}.largeSegments.till`;
    }
  };
}
