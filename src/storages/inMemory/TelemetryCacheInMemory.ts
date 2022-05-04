import { ImpressionDataType, EventDataType, LastSync, HttpErrors, HttpLatencies, StreamingEvent, Method, OperationType, MethodExceptions, MethodLatencies } from '../../sync/submitters/types';
import { findLatencyIndex } from '../findLatencyIndex';
import { ITelemetryCacheSync } from '../types';

const MAX_STREAMING_EVENTS = 20;
const MAX_TAGS = 10;

function newBuckets() {
  // MAX_LATENCY_BUCKET_COUNT (length) is 23;
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

const ACCEPTANCE_RANGE = 0.001;

/**
 * Used on client-side. 0.1% of instances will track telemetry
 */
export function shouldRecordTelemetry() {
  return Math.random() <= ACCEPTANCE_RANGE;
}

export class TelemetryCacheInMemory implements ITelemetryCacheSync {

  private timeUntilReady?: number;

  getTimeUntilReady() {
    return this.timeUntilReady;
  }

  recordTimeUntilReady(ms: number) {
    this.timeUntilReady = ms;
  }

  private timeUntilReadyFromCache?: number;

  getTimeUntilReadyFromCache() {
    return this.timeUntilReadyFromCache;
  }

  recordTimeUntilReadyFromCache(ms: number) {
    this.timeUntilReadyFromCache = ms;
  }

  private notReadyUsage = 0;

  getNonReadyUsage() {
    return this.notReadyUsage;
  }

  recordNonReadyUsage() {
    this.notReadyUsage++;
  }

  private impressionStats = [0, 0, 0];

  getImpressionStats(type: ImpressionDataType) {
    return this.impressionStats[type];
  }

  recordImpressionStats(type: ImpressionDataType, count: number) {
    this.impressionStats[type] += count;
  }

  private eventStats = [0, 0];

  getEventStats(type: EventDataType) {
    return this.eventStats[type];
  }

  recordEventStats(type: EventDataType, count: number) {
    this.eventStats[type] += count;
  }

  // @ts-expect-error
  private lastSync: LastSync = {};

  getLastSynchronization() {
    return this.lastSync;
  }

  recordSuccessfulSync(resource: OperationType, timeMs: number) {
    this.lastSync[resource] = timeMs;
  }

  // @ts-expect-error
  private httpErrors: HttpErrors = {};

  popHttpErrors() {
    const result = this.httpErrors; // @ts-expect-error
    this.httpErrors = {};
    return result;
  }

  recordHttpError(resource: OperationType, status: number) {
    if (!this.httpErrors[resource]) this.httpErrors[resource] = {};
    if (!this.httpErrors[resource][status]) {
      this.httpErrors[resource][status] = 1;
    } else {
      this.httpErrors[resource][status]++;
    }
  }

  // @ts-expect-error
  private httpLatencies: HttpLatencies = {};

  popHttpLatencies() {
    const result = this.httpLatencies; // @ts-expect-error
    this.httpLatencies = {};
    return result;
  }

  recordHttpLatency(resource: OperationType, latencyMs: number) {
    if (!this.httpLatencies[resource]) {
      this.httpLatencies[resource] = newBuckets();
    }
    this.httpLatencies[resource][findLatencyIndex(latencyMs)]++;
  }

  private authRejections = 0;

  popAuthRejections() {
    const result = this.authRejections;
    this.authRejections = 0;
    return result;
  }

  recordAuthRejections() {
    this.authRejections++;
  }

  private tokenRefreshes = 0;

  popTokenRefreshes() {
    const result = this.tokenRefreshes;
    this.tokenRefreshes = 0;
    return result;
  }

  recordTokenRefreshes() {
    this.tokenRefreshes++;
  }

  private streamingEvents: StreamingEvent[] = []

  popStreamingEvents() {
    return this.streamingEvents.splice(0);
  }

  recordStreamingEvents(streamingEvent: StreamingEvent) {
    if (this.streamingEvents.length < MAX_STREAMING_EVENTS) {
      this.streamingEvents.push(streamingEvent);
    }
  }

  private tags: string[] = [];

  popTags() {
    return this.tags.splice(0);
  }

  addTag(tag: string) {
    if (this.tags.length < MAX_TAGS) {
      this.tags.push(tag);
    }
  }

  private sessionLength?: number;

  getSessionLength() {
    return this.sessionLength;
  }

  recordSessionLength(ms: number) {
    this.sessionLength = ms;
  }

  // @ts-expect-error
  private exceptions: MethodExceptions = {};

  popExceptions() {
    const result = this.exceptions; // @ts-expect-error
    this.exceptions = {};
    return result;
  }

  recordException(method: Method) {
    if (!this.exceptions[method]) {
      this.exceptions[method] = 1;
    } else {
      this.exceptions[method]++;
    }
  }

  // @ts-expect-error
  private latencies: MethodLatencies = {};

  popLatencies() {
    const result = this.latencies; // @ts-expect-error
    this.latencies = {};
    return result;
  }

  recordLatency(method: Method, latencyMs: number) {
    if (!this.latencies[method]) {
      this.latencies[method] = newBuckets();
    }
    this.latencies[method][findLatencyIndex(latencyMs)]++;
  }

}
