import { telemetrySubmitterFactory } from '../telemetrySubmitter';
import { InMemoryStorageFactory } from '../../../storages/inMemory/InMemoryStorage';
import { SDK_READY, SDK_READY_FROM_CACHE } from '../../../readiness/constants';
import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { ISyncTask } from '../../types';

describe('Telemetry submitter', () => {

  const telemetryRefreshRate = 100; // 100 ms
  const postMetricsUsage = jest.fn(() => Promise.resolve());
  const postMetricsConfig = jest.fn(() => Promise.resolve());
  const readinessGateCallbacks: Record<string, () => void> = {};
  const params = {
    settings: { ...fullSettings, scheduler: { ...fullSettings.scheduler, telemetryRefreshRate } },
    splitApi: { postMetricsUsage, postMetricsConfig }, // @ts-ignore
    storage: InMemoryStorageFactory({}),
    platform: { now: () => 123 }, // by returning a fixed timestamp, all latencies are equal to 0
    sdkReadinessManager: { incInternalReadyCbCount: jest.fn(), },
    readiness: {
      gate: {
        once: jest.fn((e: string, cb: () => void) => {
          readinessGateCallbacks[e] = cb;
        })
      }
    }
  };

  test('submits metrics/usage periodically', async () => { // @ts-ignore
    const telemetrySubmitter = telemetrySubmitterFactory(params) as ISyncTask;
    const popLatenciesSpy = jest.spyOn(params.storage.telemetry!, 'popLatencies');

    telemetrySubmitter.start();
    expect(telemetrySubmitter.isRunning()).toEqual(true); // Submitter should be flagged as running
    expect(telemetrySubmitter.isExecuting()).toEqual(false); // but not executed immediatelly (first push window)
    expect(popLatenciesSpy).toBeCalledTimes(0);

    // Await first push
    await new Promise(res => setTimeout(res, params.settings.scheduler.telemetryRefreshRate + 10));
    // after the first push, telemetry cache should have been used to create the request payload
    expect(popLatenciesSpy).toBeCalledTimes(1);
    expect(postMetricsUsage).toBeCalledWith(JSON.stringify({
      lS: {}, mL: {}, mE: {}, hE: {}, hL: {}, tR: 0, aR: 0, iQ: 0, iDe: 0, iDr: 0, spC: 0, seC: 0, skC: 0, eQ: 0, eD: 0, sE: [], t: []
    }));

    expect(telemetrySubmitter.isRunning()).toEqual(true);
    telemetrySubmitter.stop();
    expect(telemetrySubmitter.isRunning()).toEqual(false);
  });

  test('submits metrics/config when SDK is ready', async () => { // @ts-ignore
    const telemetrySubmitter = telemetrySubmitterFactory(params) as ISyncTask;
    const recordTimeUntilReadyFromCacheSpy = jest.spyOn(params.storage.telemetry!, 'recordTimeUntilReadyFromCache');
    const recordTimeUntilReadySpy = jest.spyOn(params.storage.telemetry!, 'recordTimeUntilReady');

    telemetrySubmitter.start();

    readinessGateCallbacks[SDK_READY_FROM_CACHE]();
    expect(recordTimeUntilReadyFromCacheSpy).toBeCalledTimes(1);

    readinessGateCallbacks[SDK_READY]();
    expect(recordTimeUntilReadySpy).toBeCalledTimes(1);

    expect(postMetricsConfig).toBeCalledWith(JSON.stringify({
      oM: 0, st: 'memory', sE: true, rR: { sp: 1, se: 1, im: 1, ev: 1, te: 100 }, uO: { s: true, e: true, a: true, st: true, t: true }, iQ: 1, eQ: 1, iM: 0, iL: false, hP: false, aF: 0, rF: 0, tR: 0, tC: 0, nR: 0, t: [], i: ['NoopIntegration']
    }));

    // Stop submitter, to not execute the 1st periodic metrics/usage POST
    telemetrySubmitter.stop();
  });

});
