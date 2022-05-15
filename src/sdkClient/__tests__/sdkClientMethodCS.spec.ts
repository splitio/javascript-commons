import { sdkClientMethodCSFactory as sdkClientMethodCSWithTTFactory } from '../sdkClientMethodCSWithTT';
import { sdkClientMethodCSFactory } from '../sdkClientMethodCS';
import { assertClientApi } from './testUtils';

import { settingsWithKey, settingsWithKeyAndTT, settingsWithKeyObject } from '../../utils/settingsValidation/__tests__/settings.mocks';

const partialStorages: { destroy: jest.Mock }[] = [];

const storageMock = {
  destroy: jest.fn(),
  shared: jest.fn(() => {
    partialStorages.push({ destroy: jest.fn() });
    return partialStorages[partialStorages.length - 1];
  })
};

const partialSdkReadinessManagers: { sdkStatus: jest.Mock, readinessManager: { destroy: jest.Mock } }[] = [];

const sdkReadinessManagerMock = {
  sdkStatus: jest.fn(),
  readinessManager: { destroy: jest.fn() },
  shared: jest.fn(() => {
    partialSdkReadinessManagers.push({
      sdkStatus: jest.fn(),
      readinessManager: { destroy: jest.fn() },
    });
    return partialSdkReadinessManagers[partialSdkReadinessManagers.length - 1];
  })
};

const partialSyncManagers: { start: jest.Mock, stop: jest.Mock, flush: jest.Mock }[] = [];

const syncManagerMock = {
  stop: jest.fn(),
  flush: jest.fn(() => Promise.resolve()),
  shared: jest.fn(() => {
    partialSyncManagers.push({ start: jest.fn(), stop: jest.fn(), flush: jest.fn(() => Promise.resolve()) });
    return partialSyncManagers[partialSyncManagers.length - 1];
  })
};

const params = {
  storage: storageMock,
  sdkReadinessManager: sdkReadinessManagerMock,
  syncManager: syncManagerMock,
  signalListener: { stop: jest.fn() },
  settings: settingsWithKey
};

const invalidAttributes = [
  new Date(),
  { some: 'object' },
  Infinity
];

const validAttributes = [
  25, // number
  Date.now(), // number
  'string', // string
  ['string', 'list'], // list
  false // boolean
];

/** End mocks */

describe('sdkClientMethodCSFactory', () => {

  afterEach(() => {
    jest.clearAllMocks();
    partialStorages.length = 0;
    partialSdkReadinessManagers.length = 0;
    partialSyncManagers.length = 0;
  });

  // list of factory functions and their types (whether it ignores TT or not)
  const testTargets = [
    [sdkClientMethodCSWithTTFactory, false],
    [sdkClientMethodCSFactory, true]
  ];

  test.each(testTargets)('main client', (sdkClientMethodCSFactory) => {
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    // should return a function
    expect(typeof sdkClientMethod).toBe('function');

    // calling the function should return a client instance
    const client = sdkClientMethod();
    assertClientApi(client, params.sdkReadinessManager.sdkStatus);

    // multiple calls should return the same instance
    expect(sdkClientMethod()).toBe(client);
    
    // `client.destroy` method should stop internal components (other client methods where validated in `client.spec.ts`)
    client.destroy().then(() => {
      expect(params.sdkReadinessManager.readinessManager.destroy).toBeCalledTimes(1);
      expect(params.storage.destroy).toBeCalledTimes(1);
      expect(params.syncManager.stop).toBeCalledTimes(1);
      expect(params.syncManager.flush).toBeCalledTimes(1);
      expect(params.signalListener.stop).toBeCalledTimes(1);
    });



  });

  test.each(testTargets)('client flush', (sdkClientMethodCSFactory) => {
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    
    // calling the function should return a client instance
    const client = sdkClientMethod();
    
    // `client.flush` method should call syncManager flush
    client.flush().then(() => {
      expect(params.syncManager.flush).toBeCalledTimes(1);
    });
  });



  test.each(testTargets)('multiple clients', async (sdkClientMethodCSFactory, ignoresTT) => {

    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    // calling the function with a diferent key than settings, should return a new client instance
    const newClients = new Set([
      sdkClientMethod('other-key'), // new client
      sdkClientMethod('other-key', 'other-tt'), // new client
      sdkClientMethod({ matchingKey: 'other-key', bucketingKey: 'buck' }) // new client
    ]);
    if (ignoresTT) expect(newClients.size).toBe(2);
    else expect(newClients.size).toBe(3);

    // each new client must follog the Client API
    newClients.forEach(newClient => {
      assertClientApi(newClient);
      expect(newClient).not.toBe(sdkClientMethod());
    });

    // shared methods call once per each new client
    expect(params.storage.shared).toBeCalledTimes(newClients.size);
    expect(params.sdkReadinessManager.shared).toBeCalledTimes(newClients.size);
    expect(params.syncManager.shared).toBeCalledTimes(newClients.size);

    // `client.destroy` of partial clients should stop internal partial components
    await Promise.all(Array.from(newClients).map(newClient => newClient.destroy()));

    partialSdkReadinessManagers.forEach((partialSdkReadinessManager) => expect(partialSdkReadinessManager.readinessManager.destroy).toBeCalledTimes(1));
    partialStorages.forEach((partialStorage) => expect(partialStorage.destroy).toBeCalledTimes(1));
    partialSyncManagers.forEach((partialSyncManager) => {
      expect(partialSyncManager.stop).toBeCalledTimes(1);
      expect(partialSyncManager.flush).toBeCalledTimes(1);
    });

    // `client.destroy` of partial clients shouldn't stop internal main components
    expect(params.sdkReadinessManager.readinessManager.destroy).not.toBeCalled();
    expect(params.storage.destroy).not.toBeCalled();
    expect(params.syncManager.stop).not.toBeCalled();
    expect(params.syncManager.flush).not.toBeCalled();
    expect(params.signalListener.stop).not.toBeCalled();

  });

  test.each(testTargets)('return main client instance if called with same key', (sdkClientMethodCSFactory) => {

    params.settings = settingsWithKey;
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    expect(sdkClientMethod()).toBe(sdkClientMethod(settingsWithKey.core.key));

    expect(params.storage.shared).not.toBeCalled();
    expect(params.sdkReadinessManager.shared).not.toBeCalled();
    expect(params.syncManager.shared).not.toBeCalled();
  });

  test.each(testTargets)('return main client instance if called with same key and TT', (sdkClientMethodCSFactory) => {

    params.settings = settingsWithKeyAndTT;
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    expect(sdkClientMethod()).toBe(sdkClientMethod(settingsWithKeyAndTT.core.key, settingsWithKeyAndTT.core.trafficType));

    expect(params.storage.shared).not.toBeCalled();
    expect(params.sdkReadinessManager.shared).not.toBeCalled();
    expect(params.syncManager.shared).not.toBeCalled();
  });

  test.each(testTargets)('return main client instance if called with same key object', (sdkClientMethodCSFactory) => {
    // @ts-expect-error
    params.settings = settingsWithKeyObject;
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    expect(sdkClientMethod()).toBe(sdkClientMethod({ matchingKey: settingsWithKeyObject.core.key.matchingKey, bucketingKey: settingsWithKeyObject.core.key.bucketingKey }));

    expect(params.storage.shared).not.toBeCalled();
    expect(params.sdkReadinessManager.shared).not.toBeCalled();
    expect(params.syncManager.shared).not.toBeCalled();
  });

  test.each(testTargets)('return same client instance if called with same key or traffic type (input validation)', (sdkClientMethodCSFactory, ignoresTT) => {
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    const clientInstance = sdkClientMethod('key', 'tt');

    expect(sdkClientMethod('key', 'tT')).toBe(clientInstance); // No new client created: TT is lowercased / ignored
    expect(sdkClientMethod(' key ', 'tt')).toBe(clientInstance); // No new client created: key is trimmed
    expect(sdkClientMethod({ matchingKey: 'key ', bucketingKey: ' key' }, 'TT')).toBe(clientInstance); // No new client created: key object is equivalent to 'key' string

    expect(params.storage.shared).toBeCalledTimes(1);
    expect(params.sdkReadinessManager.shared).toBeCalledTimes(1);
    expect(params.syncManager.shared).toBeCalledTimes(1);

    expect(sdkClientMethod('KEY', 'tt')).not.toBe(clientInstance); // New client created: key is case-sensitive
    if (!ignoresTT) expect(sdkClientMethod('key', 'TT ')).not.toBe(clientInstance); // New client created: TT is not trimmed

    const clientCount = ignoresTT ? 2 : 3;
    expect(params.storage.shared).toBeCalledTimes(clientCount);
    expect(params.sdkReadinessManager.shared).toBeCalledTimes(clientCount);
    expect(params.syncManager.shared).toBeCalledTimes(clientCount);
  });

  test.each(testTargets)('invalid calls throw an error', (sdkClientMethodCSFactory, ignoresTT) => {
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);
    expect(() => sdkClientMethod({ matchingKey: settingsWithKey.core.key, bucketingKey: undefined })).toThrow('Shared Client needs a valid key.');
    if (!ignoresTT) expect(() => sdkClientMethod('valid-key', ['invalid-TT'])).toThrow('Shared Client needs a valid traffic type or no traffic type at all.');
  });

  test.each(testTargets)('attributes binding - main client', (sdkClientMethodCSFactory) => {
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    // should return a function
    expect(typeof sdkClientMethod).toBe('function');

    // calling the function should return a client instance
    const client = sdkClientMethod();
    assertClientApi(client, params.sdkReadinessManager.sdkStatus);

    expect(client.setAttribute('attributeName1', 'attributeValue1')).toEqual(true);
    expect(client.setAttribute('attributeName2', 'attributeValue2')).toEqual(true);

    expect(client.setAttribute('', 'empty')).toEqual(false); // Attribute name should not be an empty string
    expect(client.setAttribute({ '': 'empty' })).toEqual(false); // Attribute name should not be an empty string

    invalidAttributes.forEach(invalidValue => {
      expect(client.setAttribute('attributeName', invalidValue)).toEqual(false);
      expect(client.setAttributes({ attributeName: invalidValue })).toEqual(false);
    });

    expect(client.getAttributes()).toEqual({ attributeName1: 'attributeValue1', attributeName2: 'attributeValue2' });

    validAttributes.forEach(validValue => {
      expect(client.setAttribute('attributeName', validValue)).toEqual(true);
    });

    validAttributes.forEach(validValue => {
      expect(client.setAttributes({ attributeName: validValue })).toEqual(true);
    });

    expect(client.getAttributes()).toEqual({ attributeName: false, attributeName1: 'attributeValue1', attributeName2: 'attributeValue2' });

    expect(client.removeAttribute('attributeName1')).toEqual(true);

    expect(client.getAttribute('attributeName1')).toEqual(undefined);
    expect(client.getAttribute('attributeName2')).toEqual('attributeValue2');

    expect(client.setAttributes({
      'attributeName3': 'attributeValue3',
      'attributeName4': 'attributeValue4'
    })).toEqual(true);

    expect(client.getAttribute('attributeName2')).toEqual('attributeValue2');
    expect(client.getAttribute('attributeName3')).toEqual('attributeValue3');
    expect(client.getAttribute('attributeName4')).toEqual('attributeValue4');

    expect(client.clearAttributes()).toEqual(true);

    expect(client.getAttributes()).toEqual({});
  });


  test.each(testTargets)('attributes binding - shared clients', (sdkClientMethodCSFactory) => {
    // @ts-expect-error
    const sdkClientMethod = sdkClientMethodCSFactory(params);

    // should return a function
    expect(typeof sdkClientMethod).toBe('function');

    // calling the function should return a client instance
    const emmanuelClient = sdkClientMethod('emmanuel@split.io');
    const emilianoClient = sdkClientMethod('emiliano@split.io');
    assertClientApi(emmanuelClient);
    assertClientApi(emilianoClient);

    expect(emmanuelClient.setAttribute('name', 'Emmanuel')).toEqual(true);
    expect(emilianoClient.setAttribute('name', 'Emiliano')).toEqual(true);

    expect(emmanuelClient.getAttribute('name')).toEqual('Emmanuel');
    expect(emilianoClient.getAttribute('name')).toEqual('Emiliano');

    expect(emmanuelClient.setAttributes({ email: 'emmanuel@split.io' })).toEqual(true);
    expect(emilianoClient.setAttributes({ email: 'emiliano@split.io' })).toEqual(true);

    expect(emmanuelClient.getAttributes()).toEqual({ name: 'Emmanuel', email: 'emmanuel@split.io' });
    expect(emilianoClient.getAttributes()).toEqual({ name: 'Emiliano', email: 'emiliano@split.io' });

    expect(emmanuelClient.clearAttributes()).toEqual(true);

    expect(emmanuelClient.getAttributes()).toEqual({});
    expect(emilianoClient.getAttributes()).toEqual({ name: 'Emiliano', email: 'emiliano@split.io' });

  });

});
