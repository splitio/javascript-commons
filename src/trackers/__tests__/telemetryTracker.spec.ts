import { EXCEPTION, SDK_NOT_READY } from '../../utils/labels';
import { telemetryTrackerFactory } from '../telemetryTracker';

test('Telemetry Tracker', async () => {

  const fakeNow = jest.fn(() => { return Date.now(); });
  const fakeTelemetryCache = {
    recordLatency: jest.fn(),
    recordException: jest.fn(),
    recordNonReadyUsage: jest.fn()
  };

  const tracker = telemetryTrackerFactory(fakeTelemetryCache, fakeNow);

  let stopTracker = tracker.start('t');
  stopTracker();

  stopTracker = tracker.start('ts');
  stopTracker(EXCEPTION);

  stopTracker = tracker.start('tc');
  stopTracker(SDK_NOT_READY);

  stopTracker = tracker.start('tcs');

  await new Promise(res => setTimeout(res, 200));
  stopTracker();

  expect(fakeTelemetryCache.recordException).toBeCalledTimes(1);
  expect(fakeTelemetryCache.recordNonReadyUsage).toBeCalledTimes(1);
  expect(fakeTelemetryCache.recordLatency).toBeCalledTimes(4);

  const latency = fakeTelemetryCache.recordLatency.mock.calls[3][1];
  expect(latency > 200 && latency < 250).toBeTruthy(); // last tracked latency is around 200 ms
});

test('Telemetry Tracker no-op', () => {
  // The instance must implement the TelemetryTracker API even if no cache is provided
  const tracker = telemetryTrackerFactory();

  const stopTracker = tracker.start('tr');
  expect(stopTracker()).toBe(undefined);
});
