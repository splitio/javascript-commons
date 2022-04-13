import { KeyBuilder } from './KeyBuilder';
import { IMetadata } from '../dtos/types';
import { Method } from '../sync/submitters/types';

const methodNames: Record<Method, string> = {
  t: 'treatment',
  ts: 'treatments',
  tc: 'treatmentWithConfig',
  tcs: 'treatmentsWithConfig',
  tr: 'track'
};

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
    return `${this.metadata.s}/${this.metadata.n}/${this.metadata.i}`;
  }

  buildImpressionsKey() {
    return `${this.prefix}.impressions`;
  }

  buildEventsKey() {
    return `${this.prefix}.events`;
  }

  buildLatencyKey(method: Method, bucket: number) {
    return `${this.prefix}.telemetry.latencies::${this.buildVersionablePrefix()}/${methodNames[method]}/${bucket}`;
  }

  buildExceptionKey(method: Method) {
    return `${this.prefix}.telemetry.exceptions::${this.buildVersionablePrefix()}/${methodNames[method]}`;
  }

  searchPatternForSplitKeys() {
    return `${this.buildSplitKeyPrefix()}*`;
  }

}
