import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { CONSUMER_MODE, STANDALONE_MODE } from '../../utils/constants';
import { sdkClientMethodFactory } from '../sdkClientMethod';
import { assertClientApi } from './testUtils';
import { telemetryTrackerFactory } from '../../trackers/telemetryTracker';
import { IBasicClient } from '../../types';

const errorMessage = 'Shared Client not supported by the storage mechanism. Create isolated instances instead.';

const paramMocks = [
  // No SyncManager (i.e., Async SDK) and No signal listener
  {
    storage: { destroy: jest.fn(() => Promise.resolve()) },
    syncManager: undefined,
    sdkReadinessManager: { sdkStatus: jest.fn(), readinessManager: { destroy: jest.fn() } },
    signalListener: undefined,
    settings: { mode: CONSUMER_MODE, log: loggerMock, core: { authorizationKey: 'sdk key '} },
    telemetryTracker: telemetryTrackerFactory(),
    clients: {},
    uniqueKeysTracker: { start: jest.fn(), stop: jest.fn() }
  },
  // SyncManager (i.e., Sync SDK) and Signal listener
  {
    storage: { destroy: jest.fn() },
    syncManager: { stop: jest.fn(), flush: jest.fn(() => Promise.resolve()) },
    sdkReadinessManager: { sdkStatus: jest.fn(), readinessManager: { destroy: jest.fn() } },
    signalListener: { stop: jest.fn() },
    settings: { mode: STANDALONE_MODE, log: loggerMock, core: { authorizationKey: 'sdk key '} },
    telemetryTracker: telemetryTrackerFactory(),
    clients: {},
    uniqueKeysTracker: { start: jest.fn(), stop: jest.fn() }
  }
];

test.each(paramMocks)('sdkClientMethodFactory', (params, done: any) => {
  // @ts-expect-error
  const sdkClientMethod = sdkClientMethodFactory(params);

  // should return a function
  expect(typeof sdkClientMethod).toBe('function');

  // calling the function should return a client instance
  const client = sdkClientMethod() as unknown as IBasicClient;
  assertClientApi(client, params.sdkReadinessManager.sdkStatus);

  // multiple calls should return the same instance
  expect(sdkClientMethod()).toBe(client);

  // flush exposed
  client.flush().then(() => {
    if (params.syncManager) {
      expect(params.syncManager.flush).toBeCalledTimes(1);
    }

    // flush called before cooldown time elapsed
    client.flush().then(() => {
      if (params.syncManager) {
        expect(loggerMock.warn).toBeCalledTimes(1);
        expect(params.syncManager.flush).toBeCalledTimes(1);
      }

      // wait for cooldown time (1sec)
      setTimeout(() => {
        // flush called after cooldown time should be executed
        client.flush().then(() => {
          if (params.syncManager) {
            expect(loggerMock.warn).toBeCalledTimes(1);
            expect(params.syncManager.flush).toBeCalledTimes(2);
          }

          // `client.destroy` method should stop internal components (other client methods are validated in `client.spec.ts`)
          client.destroy().then(() => {
            expect(params.sdkReadinessManager.readinessManager.destroy).toBeCalledTimes(1);
            expect(params.storage.destroy).toBeCalledTimes(1);
            expect(params.uniqueKeysTracker.stop).toBeCalledTimes(1);

            if (params.syncManager) {
              expect(params.syncManager.stop).toBeCalledTimes(1);
              expect(params.syncManager.flush).toBeCalledTimes(3);
            }
            if (params.signalListener) expect(params.signalListener.stop).toBeCalledTimes(1);

            done();
          });
        });
      }, 1000);

    });
  });

  // calling the function with parameters should throw an error
  // @ts-expect-error
  expect(() => { sdkClientMethod('some_key'); }).toThrow(errorMessage); // @ts-expect-error
  expect(() => { sdkClientMethod('some_key', 'some_tt'); }).toThrow(errorMessage);

  loggerMock.mockClear();

});
