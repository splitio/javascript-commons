import { EXCEPTION, SDK_NOT_READY } from '../../utils/labels';
import { nearlyEqual } from '../../__tests__/testUtils';
import { telemetryTrackerFactory } from '../telemetryTracker';

describe('Telemetry Tracker', () => {

  const fakeNow = jest.fn(() => { return Date.now(); });
  const fakeTelemetryCache = {
    recordLatency: jest.fn(),
    recordException: jest.fn(),
    recordNonReadyUsage: jest.fn(),
    recordHttpLatency: jest.fn(),
    recordHttpError: jest.fn(),
    recordSessionLength: jest.fn(),
    recordStreamingEvents: jest.fn(),
  };
  // @ts-ignore
  const tracker = telemetryTrackerFactory(fakeTelemetryCache, fakeNow);
  const startTimestamp = Date.now();

  test('trackEval', async () => {

    let stopTracker = tracker.trackEval('t');
    stopTracker();

    stopTracker = tracker.trackEval('ts');
    stopTracker(EXCEPTION);

    stopTracker = tracker.trackEval('tc');
    stopTracker(SDK_NOT_READY);

    stopTracker = tracker.trackEval('tcs');

    await new Promise(res => setTimeout(res, 100));
    stopTracker();

    expect(fakeTelemetryCache.recordException).toBeCalledTimes(1);
    expect(fakeTelemetryCache.recordNonReadyUsage).toBeCalledTimes(1);
    expect(fakeTelemetryCache.recordLatency).toBeCalledTimes(4);

    const latency = fakeTelemetryCache.recordLatency.mock.calls[3][1];
    expect(nearlyEqual(latency, 100)).toBeTruthy(); // last tracked latency is around 100 ms
  });

  test('trackHttp', async () => {

    let stopTracker = tracker.trackHttp('ev');
    stopTracker();

    stopTracker = tracker.trackHttp('ic'); // @ts-ignore
    stopTracker({ statusCode: 400 });

    stopTracker = tracker.trackHttp('im');

    await new Promise(res => setTimeout(res, 100));
    stopTracker();

    expect(fakeTelemetryCache.recordHttpError).toBeCalledTimes(1);
    expect(fakeTelemetryCache.recordHttpLatency).toBeCalledTimes(3);

    const latency = fakeTelemetryCache.recordHttpLatency.mock.calls[2][1];
    expect(nearlyEqual(latency, 100)).toBeTruthy(); // last tracked latency is around 100 ms
  });

  test('trackSessionLength', () => {
    tracker.sessionLength();
    expect(fakeTelemetryCache.recordSessionLength).toBeCalledTimes(1);

    const expectedSessionLength = Date.now() - startTimestamp;
    const sessionLength = fakeTelemetryCache.recordSessionLength.mock.calls[0][0];
    expect(nearlyEqual(sessionLength, expectedSessionLength)).toBeTruthy();
  });

  test('streamingEvent', () => {
    tracker.streamingEvent(10, 1);
    expect(fakeTelemetryCache.recordStreamingEvents).toBeCalledTimes(1);
  });

});

test('Telemetry Tracker no-op', () => {
  // The instance must implement the TelemetryTracker API even if no cache is provided
  const tracker = telemetryTrackerFactory();

  const stopEvalTracker = tracker.trackEval('tr');
  expect(stopEvalTracker()).toBe(undefined);

  const stopHttpTracker = tracker.trackHttp('ev');
  expect(stopHttpTracker()).toBe(undefined);

  expect(tracker.sessionLength()).toBe(undefined);
  expect(tracker.streamingEvent(10, 1)).toBe(undefined);
});
