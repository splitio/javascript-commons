import { ImpressionDataType, EventDataType, LastSync, HttpErrors, HttpLatencies, StreamingEvent, Method, OperationType, MethodExceptions, MethodLatencies, TelemetryUsageStatsPayload, UpdatesFromSSEEnum } from '../../sync/submitters/types';
import { DEDUPED, DROPPED, LOCALHOST_MODE, QUEUED } from '../../utils/constants';
import { findLatencyIndex } from '../findLatencyIndex';
import { ISegmentsCacheSync, ISplitsCacheSync, IStorageFactoryParams, ITelemetryCacheSync } from '../types';

const MAX_STREAMING_EVENTS = 20;
const MAX_TAGS = 10;
export const MAX_LATENCY_BUCKET_COUNT = 23;

export function newBuckets() {
  // MAX_LATENCY_BUCKET_COUNT (length) is 23
  // Not using Array.fill for old browsers compatibility
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

const ACCEPTANCE_RANGE = 0.001;

/**
 * Record telemetry if mode is not localhost.
 * All factory instances track telemetry on server-side, and 0.1% on client-side.
 */
export function shouldRecordTelemetry({ settings }: IStorageFactoryParams) {
  return settings.mode !== LOCALHOST_MODE && (settings.core.key === undefined || Math.random() <= ACCEPTANCE_RANGE);
}

export class TelemetryCacheInMemory implements ITelemetryCacheSync {

  constructor(private splits?: ISplitsCacheSync, private segments?: ISegmentsCacheSync) { }

  // isEmpty flag
  private e = true;

  isEmpty() { return this.e; }

  clear() { /* no-op */ }

  pop(): TelemetryUsageStatsPayload {
    this.e = true;

    return {
      lS: this.getLastSynchronization(),
      mL: this.popLatencies(),
      mE: this.popExceptions(),
      hE: this.popHttpErrors(),
      hL: this.popHttpLatencies(),
      tR: this.popTokenRefreshes(),
      aR: this.popAuthRejections(),
      iQ: this.getImpressionStats(QUEUED),
      iDe: this.getImpressionStats(DEDUPED),
      iDr: this.getImpressionStats(DROPPED),
      spC: this.splits && this.splits.getSplitNames().length,
      seC: this.segments && this.segments.getRegisteredSegments().length,
      skC: this.segments && this.segments.getKeysCount(),
      sL: this.getSessionLength(),
      eQ: this.getEventStats(QUEUED),
      eD: this.getEventStats(DROPPED),
      sE: this.popStreamingEvents(),
      t: this.popTags(),
      ufs: this.popUpdatesFromSSE(),
    };
  }

  /** Config stats */

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

  /** Usage stats */

  private impressionStats = [0, 0, 0];

  getImpressionStats(type: ImpressionDataType) {
    return this.impressionStats[type];
  }

  recordImpressionStats(type: ImpressionDataType, count: number) {
    this.impressionStats[type] += count;
    this.e = false;
  }

  private eventStats = [0, 0];

  getEventStats(type: EventDataType) {
    return this.eventStats[type];
  }

  recordEventStats(type: EventDataType, count: number) {
    this.eventStats[type] += count;
    this.e = false;
  }

  private lastSync: LastSync = {};

  getLastSynchronization() {
    return this.lastSync;
  }

  recordSuccessfulSync(resource: OperationType, timeMs: number) {
    this.lastSync[resource] = timeMs;
    this.e = false;
  }

  private httpErrors: HttpErrors = {};

  popHttpErrors() {
    const result = this.httpErrors;
    this.httpErrors = {};
    return result;
  }

  recordHttpError(resource: OperationType, status: number) {
    const statusErrors = (this.httpErrors[resource] = this.httpErrors[resource] || {});
    statusErrors[status] = (statusErrors[status] || 0) + 1;
    this.e = false;
  }

  private httpLatencies: HttpLatencies = {};

  popHttpLatencies() {
    const result = this.httpLatencies;
    this.httpLatencies = {};
    return result;
  }

  recordHttpLatency(resource: OperationType, latencyMs: number) {
    const latencyBuckets = (this.httpLatencies[resource] = this.httpLatencies[resource] || newBuckets());
    latencyBuckets[findLatencyIndex(latencyMs)]++;
    this.e = false;
  }

  private authRejections = 0;

  popAuthRejections() {
    const result = this.authRejections;
    this.authRejections = 0;
    return result;
  }

  recordAuthRejections() {
    this.authRejections++;
    this.e = false;
  }

  private tokenRefreshes = 0;

  popTokenRefreshes() {
    const result = this.tokenRefreshes;
    this.tokenRefreshes = 0;
    return result;
  }

  recordTokenRefreshes() {
    this.tokenRefreshes++;
    this.e = false;
  }

  private streamingEvents: StreamingEvent[] = []

  popStreamingEvents() {
    return this.streamingEvents.splice(0);
  }

  recordStreamingEvents(streamingEvent: StreamingEvent) {
    if (this.streamingEvents.length < MAX_STREAMING_EVENTS) {
      this.streamingEvents.push(streamingEvent);
    }
    this.e = false;
  }

  private tags: string[] = [];

  popTags() {
    return this.tags.splice(0);
  }

  addTag(tag: string) {
    if (this.tags.length < MAX_TAGS) {
      this.tags.push(tag);
    }
    this.e = false;
  }

  private sessionLength?: number;

  getSessionLength() {
    return this.sessionLength;
  }

  recordSessionLength(ms: number) {
    this.sessionLength = ms;
    this.e = false;
  }

  private exceptions: MethodExceptions = {};

  popExceptions() {
    const result = this.exceptions;
    this.exceptions = {};
    return result;
  }

  recordException(method: Method) {
    this.exceptions[method] = (this.exceptions[method] || 0) + 1;
    this.e = false;
  }

  private latencies: MethodLatencies = {};

  popLatencies() {
    const result = this.latencies;
    this.latencies = {};
    return result;
  }

  recordLatency(method: Method, latencyMs: number) {
    const latencyBuckets = (this.latencies[method] = this.latencies[method] || newBuckets());
    latencyBuckets[findLatencyIndex(latencyMs)]++;
    this.e = false;
  }

  private updatesFromSSE = {
    sp: 0,
    ms: 0
  };

  popUpdatesFromSSE() {
    const result = this.updatesFromSSE;
    this.updatesFromSSE = {
      sp: 0,
      ms: 0,
    };
    return result;
  }

  recordUpdatesFromSSE(type: UpdatesFromSSEEnum) {
    this.updatesFromSSE[type]++;
    this.e = false;
  }

}
