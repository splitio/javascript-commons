// Shared utils for Redis and Pluggable storage

import { IMetadata } from '../dtos/types';
import { Method, StoredImpressionWithMetadata } from '../sync/submitters/types';
import { ImpressionDTO, ISettings } from '../types';
import { UNKNOWN } from '../utils/constants';
import { MAX_LATENCY_BUCKET_COUNT } from './inMemory/TelemetryCacheInMemory';
import { METHOD_NAMES } from './KeyBuilderSS';

export function metadataBuilder(settings: Pick<ISettings, 'version' | 'runtime'>): IMetadata {
  return {
    s: settings.version,
    i: settings.runtime.ip || UNKNOWN,
    n: settings.runtime.hostname || UNKNOWN,
  };
}

// Converts impressions to be stored in Redis or pluggable storage.
export function impressionsToJSON(impressions: ImpressionDTO[], metadata: IMetadata): string[] {
  return impressions.map(impression => {
    const impressionWithMetadata: StoredImpressionWithMetadata = {
      m: metadata,
      i: {
        k: impression.keyName,
        b: impression.bucketingKey,
        f: impression.feature,
        t: impression.treatment,
        r: impression.label,
        c: impression.changeNumber,
        m: impression.time,
        pt: impression.pt,
      }
    };

    return JSON.stringify(impressionWithMetadata);
  });
}

// Utilities used by TelemetryCacheInRedis and TelemetryCachePluggable

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
