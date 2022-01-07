import { startsWith } from '../utils/lang';
import { KeyBuilder } from './KeyBuilder';

export class KeyBuilderCS extends KeyBuilder {

  protected readonly regexSplitsCacheKey: RegExp;
  protected readonly matchingKey: string;

  constructor(prefix: string, matchingKey: string) {
    super(prefix);
    this.matchingKey = matchingKey;
    this.regexSplitsCacheKey = new RegExp(`^${prefix}\\.(splits?|trafficType)\\.`);
  }

  /**
   * @override
   */
  buildSegmentNameKey(segmentName: string) {
    return `${this.matchingKey}.${this.prefix}.segment.${segmentName}`;
  }

  extractSegmentName(builtSegmentKeyName: string) {
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

  buildSplitsFilterQueryKey() {
    return `${this.prefix}.splits.filterQuery`;
  }
}
