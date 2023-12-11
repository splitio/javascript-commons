import { KeyBuilder } from './KeyBuilder';
import { IMetadata } from '../dtos/types';
import { Method } from '../sync/submitters/types';

export const METHOD_NAMES: Record<Method, string> = {
  t: 'treatment',
  ts: 'treatments',
  tc: 'treatmentWithConfig',
  tcs: 'treatmentsWithConfig',
  tf: 'treatmentsByFlagSet',
  tfs: 'treatmentsByFlagSets',
  tcf: 'treatmentsWithConfigByFlagSet',
  tcfs: 'treatmentsWithConfigByFlagSets',
  tr: 'track'
};

export class KeyBuilderSS extends KeyBuilder {

  readonly latencyPrefix: string;
  readonly exceptionPrefix: string;
  readonly initPrefix: string;
  private readonly versionablePrefix: string;

  constructor(prefix: string, metadata: IMetadata) {
    super(prefix);
    this.latencyPrefix = `${this.prefix}.telemetry.latencies`;
    this.exceptionPrefix = `${this.prefix}.telemetry.exceptions`;
    this.initPrefix = `${this.prefix}.telemetry.init`;
    this.versionablePrefix = `${metadata.s}/${metadata.n}/${metadata.i}`;
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
    return `${this.latencyPrefix}::${this.versionablePrefix}/${METHOD_NAMES[method]}/${bucket}`;
  }

  buildExceptionKey(method: Method) {
    return `${this.exceptionPrefix}::${this.versionablePrefix}/${METHOD_NAMES[method]}`;
  }

  buildInitKey() {
    return `${this.initPrefix}::${this.versionablePrefix}`;
  }

}
