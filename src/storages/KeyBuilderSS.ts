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

  buildImpressionsKey() {
    return `${this.prefix}.impressions`;
  }

  buildImpressionsCountKey() {
    return `${this.prefix}.impressions.count`;
  }
  
  buildUniqueKeysKey() {
    return `${this.prefix}.uniquekeys`;
  }

  buildEventsKey() {
    return `${this.prefix}.events`;
  }

  searchPatternForSplitKeys() {
    return `${this.buildSplitKeyPrefix()}*`;
  }

  /* Telemetry keys */

  buildLatencyKey(method: Method, bucket: number) {
    return `${this.prefix}.telemetry.latencies::${this.buildVersionablePrefix()}/${methodNames[method]}/${bucket}`;
  }

  buildExceptionKey(method: Method) {
    return `${this.prefix}.telemetry.exceptions::${this.buildVersionablePrefix()}/${methodNames[method]}`;
  }

  buildInitKey() {
    return `${this.prefix}.telemetry.init::${this.buildVersionablePrefix()}`;
  }

  private buildVersionablePrefix() {
    return `${this.metadata.s}/${this.metadata.n}/${this.metadata.i}`;
  }

}
