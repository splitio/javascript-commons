import { EXCEPTION, SDK_NOT_READY } from '../../utils/labels';
import { nearlyEqual } from '../../__tests__/testUtils';
import { telemetryTrackerFactory } from '../telemetryTracker';

describe('Telemetry Tracker', () => {

  const fakeNow = jest.fn(() => { return Date.now(); });
  const fakeTelemetryCache = {
    recordLatency: jest.fn(),
    recordException: jest.fn(),
    recordNonReadyUsage: jest.fn(),
  };

  const tracker = telemetryTrackerFactory(fakeTelemetryCache, fakeNow);

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
    expect(fakeTelemetryCache.recordLatency).toBeCalledTimes(3);

    const latency = fakeTelemetryCache.recordLatency.mock.calls[2][1];
    expect(nearlyEqual(latency, 100)).toBeTruthy(); // last tracked latency is around 100 ms
  });

});

test('Telemetry Tracker no-op', () => {
  // The instance must implement the TelemetryTracker API even if no cache is provided
  const tracker = telemetryTrackerFactory();

  const stopEvalTracker = tracker.trackEval('tr');
  expect(stopEvalTracker()).toBe(undefined);
});
