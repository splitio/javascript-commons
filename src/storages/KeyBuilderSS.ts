import { KeyBuilder } from './KeyBuilder';
import { IMetadata } from '../dtos/types';

// NOT USED
// const everythingAfterCount = /count\.([^/]+)$/;
// const latencyMetricNameAndBucket = /latency\.([^/]+)\.bucket\.([0-9]+)$/;

export class KeyBuilderSS extends KeyBuilder {

  protected readonly metadata: IMetadata;

  constructor(prefix: string, metadata: IMetadata) {
    super(prefix);
    this.metadata = metadata;
  }

  buildRegisteredSegmentsKey() {
    return `${this.prefix}.segments.registered`;
  }

  private buildVersionablePrefix() {
    return `${this.prefix}/${this.metadata.s}/${this.metadata.i}`;
  }

  buildImpressionsKey() {
    return `${this.prefix}.impressions`;
  }

  buildEventsKey() {
    return `${this.prefix}.events`;
  }

  private buildLatencyKeyPrefix() {
    return `${this.buildVersionablePrefix()}/latency`;
  }

  buildLatencyKey(metricName: string, bucketNumber: number | string) {
    return `${this.buildLatencyKeyPrefix()}.${metricName}.bucket.${bucketNumber}`;
  }

  buildCountKey(metricName: string) {
    return `${this.buildVersionablePrefix()}/count.${metricName}`;
  }

  // NOT USED
  // buildGaugeKey(metricName: string) {
  //   return `${this.buildVersionablePrefix()}/gauge.${metricName}`;
  // }

  // NOT USED
  // searchPatternForCountKeys() {
  //   return `${this.buildVersionablePrefix()}/count.*`;
  // }

  searchPatternForSplitKeys() {
    return `${this.buildSplitKeyPrefix()}*`;
  }

  // NOT USED
  // searchPatternForLatency() {
  //   return `${this.buildLatencyKeyPrefix()}.*`;
  // }

  // NOT USED
  // extractCounterName(counterKey: string) {
  //   const m = counterKey.match(everythingAfterCount);
  //   if (m && m.length) {
  //     return m[1]; // everything after count
  //   } else {
  //     throw new Error('Invalid counter key provided');
  //   }
  // }

  // NOT USED
  // extractLatencyMetricNameAndBucket(latencyKey: string) {
  //   const parts = latencyKey.match(latencyMetricNameAndBucket);

  //   if (parts && parts.length > 2) {
  //     return {
  //       metricName: parts[1],
  //       bucketNumber: parts[2]
  //     };
  //   } else {
  //     throw new Error('Invalid counter key provided');
  //   }
  // }
}
