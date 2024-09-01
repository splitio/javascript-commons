import { QUEUED, DROPPED, DEDUPED, EVENTS, IMPRESSIONS, IMPRESSIONS_COUNT, MEMBERSHIPS, SEGMENT, SPLITS, TELEMETRY, TOKEN, TRACK, TREATMENT, TREATMENTS, TREATMENTS_WITH_CONFIG, TREATMENT_WITH_CONFIG } from '../../../utils/constants';
import { EventDataType, ImpressionDataType, Method, OperationType, StreamingEvent } from '../../../sync/submitters/types';
import { TelemetryCacheInMemory } from '../TelemetryCacheInMemory';

const impressionDataTypes: ImpressionDataType[] = [QUEUED, DROPPED, DEDUPED];

const eventDataTypes: EventDataType[] = [QUEUED, DROPPED];

const operationTypes: OperationType[] = [
  SPLITS,
  IMPRESSIONS,
  IMPRESSIONS_COUNT,
  EVENTS,
  TELEMETRY,
  TOKEN,
  SEGMENT,
  MEMBERSHIPS
];

const methods: Method[] = [
  TREATMENT,
  TREATMENTS,
  TREATMENT_WITH_CONFIG,
  TREATMENTS_WITH_CONFIG,
  TRACK
];

const latencies = [0, 0.500, 1.400, 17.085, 7999.999];
const latencyBuckets = [2, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];

describe('TELEMETRY CACHE', () => {
  const cache = new TelemetryCacheInMemory();

  test('time until ready', () => {
    expect(cache.getTimeUntilReady()).toBe(undefined);
    cache.recordTimeUntilReady(100);
    expect(cache.getTimeUntilReady()).toBe(100);
  });

  test('time until ready from cache', () => {
    expect(cache.getTimeUntilReadyFromCache()).toBe(undefined);
    cache.recordTimeUntilReadyFromCache(10);
    expect(cache.getTimeUntilReadyFromCache()).toBe(10);
  });

  test('session length', () => {
    expect(cache.getSessionLength()).toBe(undefined);
    cache.recordSessionLength(10);
    expect(cache.getSessionLength()).toBe(10);
  });

  test('not ready usage', () => {
    expect(cache.getNonReadyUsage()).toBe(0);
    cache.recordNonReadyUsage();
    expect(cache.getNonReadyUsage()).toBe(1);
    cache.recordNonReadyUsage();
    cache.recordNonReadyUsage();
    expect(cache.getNonReadyUsage()).toBe(3);
  });

  test('impression stats', () => {
    impressionDataTypes.forEach((stat: ImpressionDataType) => {
      expect(cache.getImpressionStats(stat)).toBe(0);
      cache.recordImpressionStats(stat, 1);
      expect(cache.getImpressionStats(stat)).toBe(1);
      cache.recordImpressionStats(stat, 10);
      expect(cache.getImpressionStats(stat)).toBe(11);
    });
  });

  test('event stats', () => {
    eventDataTypes.forEach((stat: EventDataType) => {
      expect(cache.getEventStats(stat)).toBe(0);
      cache.recordEventStats(stat, 1);
      expect(cache.getEventStats(stat)).toBe(1);
      cache.recordEventStats(stat, 2);
      expect(cache.getEventStats(stat)).toBe(3);
    });
  });

  test('last synchronization', () => {
    expect(cache.getLastSynchronization()).toEqual({});
    operationTypes.forEach((operation, index) => {
      cache.recordSuccessfulSync(operation, index);
    });

    const expectedLastSync = { 'sp': 0, 'im': 1, 'ic': 2, 'ev': 3, 'te': 4, 'to': 5, 'se': 6, 'ms': 7 };
    expect(cache.getLastSynchronization()).toEqual(expectedLastSync);

    // Overwrite a single operation
    cache.recordSuccessfulSync(MEMBERSHIPS, 100);
    expect(cache.getLastSynchronization()).toEqual({ ...expectedLastSync, 'ms': 100 });
  });

  test('http errors', () => {
    expect(cache.popHttpErrors()).toEqual({});
    operationTypes.forEach((operation) => {
      cache.recordHttpError(operation, 400);
      cache.recordHttpError(operation, 400);
      cache.recordHttpError(operation, 500);
    });

    const httpErrors = { '400': 2, '500': 1 };
    const expectedHttpErrors = { 'sp': httpErrors, 'im': httpErrors, 'ic': httpErrors, 'ev': httpErrors, 'te': httpErrors, 'to': httpErrors, 'se': httpErrors, 'ms': httpErrors };
    expect(cache.popHttpErrors()).toEqual(expectedHttpErrors);
    expect(cache.popHttpErrors()).toEqual({});

    // Set a single http error
    cache.recordHttpError(MEMBERSHIPS, 400);
    expect(cache.popHttpErrors()).toEqual({ 'ms': { 400: 1 } });
  });

  test('http latencies', () => {
    expect(cache.popHttpLatencies()).toEqual({});
    operationTypes.forEach((operation) => {
      latencies.forEach((latency) => {
        cache.recordHttpLatency(operation, latency);
      });
    });

    const expectedLatencyBuckets = { 'sp': latencyBuckets, 'im': latencyBuckets, 'ic': latencyBuckets, 'ev': latencyBuckets, 'te': latencyBuckets, 'to': latencyBuckets, 'se': latencyBuckets, 'ms': latencyBuckets };
    expect(cache.popHttpLatencies()).toEqual(expectedLatencyBuckets);
    expect(cache.popHttpLatencies()).toEqual({});
  });

  test('auth rejections', () => {
    expect(cache.popAuthRejections()).toBe(0);
    cache.recordAuthRejections();
    expect(cache.popAuthRejections()).toBe(1);
    expect(cache.popAuthRejections()).toBe(0);
    cache.recordAuthRejections();
    cache.recordAuthRejections();
    expect(cache.popAuthRejections()).toBe(2);
    expect(cache.popAuthRejections()).toBe(0);
  });

  test('token refreshes', () => {
    expect(cache.popTokenRefreshes()).toBe(0);
    cache.recordTokenRefreshes();
    expect(cache.popTokenRefreshes()).toBe(1);
    expect(cache.popTokenRefreshes()).toBe(0);
    cache.recordTokenRefreshes();
    cache.recordTokenRefreshes();
    expect(cache.popTokenRefreshes()).toBe(2);
    expect(cache.popTokenRefreshes()).toBe(0);
  });

  test('streaming events', () => {
    const streamingEvent: StreamingEvent = { e: 10, d: 2, t: 3 };

    expect(cache.popStreamingEvents()).toEqual([]);
    cache.recordStreamingEvents(streamingEvent);
    expect(cache.popStreamingEvents()).toEqual([streamingEvent]);
    expect(cache.popStreamingEvents()).toEqual([]);

    // MAX_STREAMING_EVENTS === 20
    for (let i = 0; i < 100; i++) {
      cache.recordStreamingEvents({ ...streamingEvent, t: i });
    }
    const actualStreamingEvents = cache.popStreamingEvents();
    expect(actualStreamingEvents.length).toBe(20);
    actualStreamingEvents.forEach((actualStreamingEvent, index) => {
      expect(actualStreamingEvent).toEqual({ ...streamingEvent, t: index });
    });
    expect(cache.popStreamingEvents()).toEqual([]);
  });

  test('tags', () => {
    expect(cache.popTags()).toEqual([]);
    cache.addTag('MY_TAG');
    expect(cache.popTags()).toEqual(['MY_TAG']);
    expect(cache.popTags()).toEqual([]);

    // MAX_TAGS === 10
    for (let i = 0; i < 100; i++) {
      cache.addTag('TAG_' + i);
    }
    expect(cache.popTags()).toEqual(['TAG_0', 'TAG_1', 'TAG_2', 'TAG_3', 'TAG_4', 'TAG_5', 'TAG_6', 'TAG_7', 'TAG_8', 'TAG_9']);
    expect(cache.popTags()).toEqual([]);
  });

  test('method exceptions', () => {
    expect(cache.popExceptions()).toEqual({});
    methods.forEach((method) => {
      cache.recordException(method);
      cache.recordException(method);
    });

    const expectedExceptions = { 't': 2, 'ts': 2, 'tc': 2, 'tcs': 2, 'tr': 2 };
    expect(cache.popExceptions()).toEqual(expectedExceptions);
    expect(cache.popExceptions()).toEqual({});

    // Set a single method exception error
    cache.recordException(TRACK);
    expect(cache.popExceptions()).toEqual({ 'tr': 1 });
  });

  test('method latencies', () => {
    expect(cache.popLatencies()).toEqual({});
    methods.forEach((method) => {
      latencies.forEach((latency) => {
        cache.recordLatency(method, latency);
      });
    });

    const expectedLatencyBuckets = { 't': latencyBuckets, 'ts': latencyBuckets, 'tc': latencyBuckets, 'tcs': latencyBuckets, 'tr': latencyBuckets };
    expect(cache.popLatencies()).toEqual(expectedLatencyBuckets);
    expect(cache.popLatencies()).toEqual({});
  });

  test('"isEmpty" and "pop" methods', () => {
    const cache = new TelemetryCacheInMemory();
    const expectedEmptyPayload = {
      lS: {}, mL: {}, mE: {}, hE: {}, hL: {}, tR: 0, aR: 0, iQ: 0, iDe: 0, iDr: 0, spC: undefined, seC: undefined, skC: undefined, eQ: 0, eD: 0, sE: [], t: [], ufs: {}
    };

    // Initially, the cache is empty
    expect(cache.isEmpty()).toBe(true);
    expect(cache.pop()).toEqual(expectedEmptyPayload);

    // Record some data to flag the cache as not empty
    cache.recordException(TRACK);
    expect(cache.isEmpty()).toBe(false);

    // Pop the data and check that the cache is empty again
    expect(cache.pop()).toEqual({ ...expectedEmptyPayload, mE: { 'tr': 1 } });
    expect(cache.isEmpty()).toBe(true);
  });

  test('updates from SSE', () => {
    expect(cache.popUpdatesFromSSE()).toEqual({});
    cache.recordUpdatesFromSSE(SPLITS);
    cache.recordUpdatesFromSSE(SPLITS);
    cache.recordUpdatesFromSSE(SPLITS);
    cache.recordUpdatesFromSSE(MEMBERSHIPS);
    cache.recordUpdatesFromSSE(MEMBERSHIPS);
    expect(cache.popUpdatesFromSSE()).toEqual({ sp: 3, ms: 2 });
    expect(cache.popUpdatesFromSSE()).toEqual({});
    cache.recordUpdatesFromSSE(SPLITS);
    cache.recordUpdatesFromSSE(MEMBERSHIPS);
    cache.recordUpdatesFromSSE(SPLITS);
    cache.recordUpdatesFromSSE(MEMBERSHIPS);
    expect(cache.popUpdatesFromSSE()).toEqual({ sp: 2, ms: 2 });
    expect(cache.popUpdatesFromSSE()).toEqual({});
  });

});
