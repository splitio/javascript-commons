import { CONSUMER_MODE, STANDALONE_MODE } from '../../utils/constants';
import { sdkClientMethodFactory } from '../sdkClientMethod';
import { assertClientApi } from './testUtils';

const errorMessage = 'Shared Client not supported by the storage mechanism. Create isolated instances instead.';

const paramMocks = [
  // No SyncManager (i.e., Async SDK) and No signal listener
  {
    storage: { destroy: jest.fn() },
    syncManager: undefined,
    sdkReadinessManager: { sdkStatus: jest.fn(), readinessManager: { destroy: jest.fn() } },
    signalListener: undefined,
    settings: { mode: CONSUMER_MODE }
  },
  // SyncManager (i.e., Sync SDK) and Signal listener
  {
    storage: { destroy: jest.fn() },
    syncManager: { stop: jest.fn(), flush: jest.fn(() => Promise.resolve()) },
    sdkReadinessManager: { sdkStatus: jest.fn(), readinessManager: { destroy: jest.fn() } },
    signalListener: { stop: jest.fn() },
    settings: { mode: STANDALONE_MODE }
  }
];

test.each(paramMocks)('sdkClientMethodFactory', (params) => {
  // @ts-expect-error
  const sdkClientMethod = sdkClientMethodFactory(params);

  // should return a function
  expect(typeof sdkClientMethod).toBe('function');

  // calling the function should return a client instance
  const client = sdkClientMethod();
  assertClientApi(client, params.sdkReadinessManager.sdkStatus);

  // multiple calls should return the same instance
  expect(sdkClientMethod()).toBe(client);

  // `client.destroy` method should stop internal components (other client methods where validated in `client.spec.ts`)
  client.destroy().then(() => {
    expect(params.sdkReadinessManager.readinessManager.destroy.mock.calls.length).toBe(1);
    expect(params.storage.destroy).toBeCalledTimes(1);

    if (params.syncManager) {
      expect(params.syncManager.stop).toBeCalledTimes(1);
      expect(params.syncManager.flush).toBeCalledTimes(1);
    }
    if (params.signalListener) expect(params.signalListener.stop.mock.calls.length).toBe(1);
  });

  // calling the function with parameters should throw an error
  // @ts-expect-error
  expect(() => { sdkClientMethod('some_key'); }).toThrow(errorMessage); // @ts-expect-error
  expect(() => { sdkClientMethod('some_key', 'some_tt'); }).toThrow(errorMessage);

});
