import { telemetrySubmitterFactory } from '../telemetrySubmitter';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { InMemoryStorageFactory } from '../../../storages/inMemory/InMemoryStorage';

describe('Telemetry submitter', () => {

  const telemetryRefreshRate = 100; // 100 ms
  const postMetricsUsage = jest.fn(() => Promise.resolve());
  const params = {
    settings: {
      log: loggerMock,
      scheduler: { telemetryRefreshRate }
    },
    splitApi: { postMetricsUsage }, // @ts-ignore
    storage: InMemoryStorageFactory({}),
  };
  const popLatenciesSpy = jest.spyOn(params.storage.telemetry!, 'popLatencies');

  test('submits metrics/usage periodically', async () => {
    // @ts-ignore
    const telemetrySubmitter = telemetrySubmitterFactory(params);

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

});
