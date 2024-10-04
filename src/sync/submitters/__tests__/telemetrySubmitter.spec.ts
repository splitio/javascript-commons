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
  const settings = {
    ...fullSettings,
    core: { ...fullSettings.core, key: undefined }, // server-side -> storage.telemetry defined
    scheduler: { ...fullSettings.scheduler, telemetryRefreshRate }
  };
  const params = {
    settings,
    splitApi: { postMetricsUsage, postMetricsConfig }, // @ts-ignore
    storage: InMemoryStorageFactory({ settings }),
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
    const isEmptySpy = jest.spyOn(params.storage.telemetry!, 'isEmpty');
    const popSpy = jest.spyOn(params.storage.telemetry!, 'pop');

    params.storage.telemetry?.addTag('tag1'); // add some data

    telemetrySubmitter.start();
    expect(telemetrySubmitter.isRunning()).toEqual(true); // Submitter should be flagged as running
    expect(telemetrySubmitter.isExecuting()).toEqual(false); // but not executed immediately (first push window)
    expect(popSpy).toBeCalledTimes(0);

    // Await first periodic execution
    await new Promise(res => setTimeout(res, params.settings.scheduler.telemetryRefreshRate + 10));
    // Telemetry cache is not empty, so data is popped and sent
    expect(isEmptySpy).toBeCalledTimes(1);
    expect(popSpy).toBeCalledTimes(1);
    expect(postMetricsUsage).toBeCalledWith(JSON.stringify({
      lS: {}, mL: {}, mE: {}, hE: {}, hL: {}, tR: 0, aR: 0, iQ: 0, iDe: 0, iDr: 0, spC: 0, seC: 0, skC: 0, eQ: 0, eD: 0, sE: [], t: ['tag1'], ufs: {}
    }));

    // Await second periodic execution
    await new Promise(res => setTimeout(res, params.settings.scheduler.telemetryRefreshRate + 10));
    // Telemetry cache is empty, so no data is popped and sent
    expect(isEmptySpy).toBeCalledTimes(2);
    expect(popSpy).toBeCalledTimes(1);
    expect(postMetricsUsage).toBeCalledTimes(1);

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
      oM: 0, st: 'memory', aF: 0, rF: 0, sE: true, rR: { sp: 0.001, se: 0.001, im: 0.001, ev: 0.001, te: 0.1 }, uO: { s: true, e: true, a: true, st: true, t: true }, iQ: 1, eQ: 1, iM: 0, iL: false, hP: false, tR: 0, tC: 0, nR: 0, t: [], i: ['NoopIntegration'], uC: 0, fsT: 0, fsI: 0
    }));

    // Stop submitter, to not execute the 1st periodic metrics/usage POST
    telemetrySubmitter.stop();
  });

});
