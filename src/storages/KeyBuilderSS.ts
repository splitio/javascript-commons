import { KeyBuilder } from './KeyBuilder';
import { IMetadata } from '../dtos/types';
import { Method } from '../sync/submitters/types';
import { MAX_LATENCY_BUCKET_COUNT } from './inMemory/TelemetryCacheInMemory';

const METHOD_NAMES: Record<Method, string> = {
  t: 'treatment',
  ts: 'treatments',
  tc: 'treatmentWithConfig',
  tcs: 'treatmentsWithConfig',
  tr: 'track'
};

export class KeyBuilderSS extends KeyBuilder {

  latencyPrefix: string;
  exceptionPrefix: string;
  initPrefix: string;
  private versionablePrefix: string;

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

// Used by consumer methods of TelemetryCacheInRedis and TelemetryCachePluggable

const REVERSE_METHOD_NAMES = Object.keys(METHOD_NAMES).reduce((acc, key) => {
  acc[METHOD_NAMES[key as Method]] = key as Method;
  return acc;
}, {} as Record<string, Method>);


export function parseMetadata(field: string): [metadata: string] | string {
  const parts = field.split('/');
  if (parts.length !== 3) return `invalid subsection count. Expected 3, got: ${parts.length}`;

  const [s /* metadata.s */, n /* metadata.n */, i /* metadata.i */] = parts;
  return [JSON.stringify({ s, n, i })];
}

export function parseExceptionField(field: string): [metadata: string, method: Method] | string {
  const parts = field.split('/');
  if (parts.length !== 4) return `invalid subsection count. Expected 4, got: ${parts.length}`;

  const [s /* metadata.s */, n /* metadata.n */, i /* metadata.i */, m] = parts;
  const method = REVERSE_METHOD_NAMES[m];
  if (!method) return `unknown method '${m}'`;

  return [JSON.stringify({ s, n, i }), method];
}

export function parseLatencyField(field: string): [metadata: string, method: Method, bucket: number] | string {
  const parts = field.split('/');
  if (parts.length !== 5) return `invalid subsection count. Expected 5, got: ${parts.length}`;

  const [s /* metadata.s */, n /* metadata.n */, i /* metadata.i */, m, b] = parts;
  const method = REVERSE_METHOD_NAMES[m];
  if (!method) return `unknown method '${m}'`;

  const bucket = parseInt(b);
  if (isNaN(bucket) || bucket >= MAX_LATENCY_BUCKET_COUNT) return `invalid bucket. Expected a number between 0 and ${MAX_LATENCY_BUCKET_COUNT - 1}, got: ${b}`;

  return [JSON.stringify({ s, n, i }), method, bucket];
}
