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
    return `${this.prefix}.${this.matchingKey}.segment.${segmentName}`;
  }

  extractSegmentName(builtSegmentKeyName: string) {
    const prefix = `${this.prefix}.${this.matchingKey}.segment.`;

    if (startsWith(builtSegmentKeyName, prefix))
      return builtSegmentKeyName.substr(prefix.length);
  }

  // @BREAKING: The key used to start with the matching key instead of the prefix, this was changed on version 10.17.3
  buildOldSegmentNameKey(segmentName: string) {
    return `${this.matchingKey}.${this.prefix}.segment.${segmentName}`;
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

  buildSplitsFilterQueryKey() {
    return `${this.prefix}.splits.filterQuery`;
  }
}
