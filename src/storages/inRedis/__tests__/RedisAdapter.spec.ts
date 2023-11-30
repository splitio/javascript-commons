// @ts-nocheck
import forEach from 'lodash/forEach';
import merge from 'lodash/merge';
import reduce from 'lodash/reduce';
import { _Set, setToArray } from '../../../utils/lang/sets';

// Mocking sdkLogger
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
const LOG_PREFIX = 'storage:redis-adapter: ';

// Mocking ioredis

// The list of methods we're wrapping on a promise (for timeout) on the adapter.
const METHODS_TO_PROMISE_WRAP = ['set', 'exec', 'del', 'get', 'keys', 'sadd', 'srem', 'sismember', 'smembers', 'incr', 'rpush', 'expire', 'mget', 'lrange', 'ltrim', 'hset', 'hincrby', 'popNRaw'];

const ioredisMock = reduce([...METHODS_TO_PROMISE_WRAP, 'disconnect'], (acc, methodName) => {
  acc[methodName] = jest.fn(() => Promise.resolve(methodName));
  return acc;
}, {
  once: jest.fn()
}) as { once: jest.Mock };

let constructorParams: any = false;

function ioredisConstructorMock() {
  constructorParams = arguments;
  merge(this, ioredisMock);
}

jest.mock('ioredis');
import ioredis from 'ioredis';
(ioredis as jest.Mock).mockImplementation(ioredisConstructorMock);

// Mocking timeout util

let timeoutPromiseResolvers: { originalPromise: Promise<any>, res: Function, rej: Function }[] = [];

const timeoutMock = jest.fn(function timeout(ms, originalPromise) {
  const resolvers: any = {};
  const promise = new Promise((res, rej) => {
    resolvers.res = res;
    resolvers.rej = rej;
    resolvers.originalPromise = originalPromise;
  });

  timeoutPromiseResolvers.unshift(resolvers);

  return promise;
});

jest.mock('../../../utils/promise/timeout');
import { timeout } from '../../../utils/promise/timeout';
(timeout as jest.Mock).mockImplementation(timeoutMock);

// Test target
import { RedisAdapter } from '../RedisAdapter';

function clearAllMocks() {
  loggerMock.mockClear();
  ioredisMock.once.mockClear();
}

describe('STORAGE Redis Adapter', () => {

  afterEach(clearAllMocks);

  /**
   * Logs here won't be changing much, so we could validate those. It's not important the exact message but what do they represent.
   */
  test('Class', () => {
    expect(Object.getPrototypeOf(RedisAdapter)).toBe(ioredis); // The returned class extends from the library of choice (ioredis).

    const instance = new RedisAdapter(loggerMock, {
      url: 'redis://localhost:6379/0',
      connectionTimeout: 10000,
      operationTimeout: 10000
    });

    expect(instance instanceof RedisAdapter).toBe(true); // Of course created instance should be an instance of the adapter.
    expect(instance instanceof ioredis).toBe(true); // And as the class extends from the library, the instance is an instance of the library as well.

    expect(typeof instance._options === 'object').toBe(true); // The instance will have an options object.
    expect(Array.isArray(instance._notReadyCommandsQueue)).toBe(true); // The instance will have an array as the _notReadyCommandsQueue property.
    expect(instance._runningCommands instanceof _Set).toBe(true); // The instance will have a set as the _runningCommands property.
  });

  test('ioredis constructor params and static method _defineLibrarySettings', () => {
    const redisUrl = 'redis://localhost:6379/0';
    const redisParams = {
      host: 'fake_host', port: '6355', 'db': 5, pass: 'fake_pass'
    };

    new RedisAdapter(loggerMock, {
      url: redisUrl,
      connectionTimeout: 123,
      operationTimeout: 124,
      tls: { ca: 'ca' }
    });
    // Keep in mind we're storing the arguments object, not a true array.
    expect(constructorParams.length).toBe(2); // In this signature, the constructor receives two params.
    expect(constructorParams[0]).toBe(redisUrl); // When we use the Redis URL, that should be the first parameter passed to ioredis constructor
    expect(constructorParams[1]).toEqual({ enableOfflineQueue: false, connectTimeout: 123, lazyConnect: false, tls: { ca: 'ca' } }); // and the second parameter would be the default settings for the lib.

    new RedisAdapter(loggerMock, {
      ...redisParams,
      connectionTimeout: 123,
      operationTimeout: 124,
      tls: { ca: 'ca' }
    });

    expect(constructorParams.length).toBe(1); // In this signature, the constructor receives one param.
    // we keep "pass" instead of "password" on our settings API to be backwards compatible.
    expect(constructorParams[0]).toEqual({ host: redisParams.host, port: redisParams.port, db: redisParams.db, password: redisParams.pass, enableOfflineQueue: false, connectTimeout: 123, lazyConnect: false, tls: { ca: 'ca' } }); // If we send all the redis params separate, it will pass one object to the library containing that and the rest of the options.

    new RedisAdapter(loggerMock, {
      ...redisParams,
      url: redisUrl,
      // Using default connectionTimeout
      operationTimeout: 124,
      tls: { ca: 'ca' }
    });

    expect(constructorParams.length).toBe(2); // In this signature, the constructor receives two params.
    expect(constructorParams[0]).toBe(redisUrl); // When we use the Redis URL, even if we specified all the other params one by one the URL takes precedence, so that should be the first parameter passed to ioredis constructor
    expect(constructorParams[1]).toEqual({ enableOfflineQueue: false, connectTimeout: 10000, lazyConnect: false, tls: { ca: 'ca' } }); // and the second parameter would be the default settings for the lib.
  });

  test('static method - _defineOptions', () => {
    const defaultOptions = {
      connectionTimeout: 10000,
      operationTimeout: 5000
    };

    expect(RedisAdapter._defineOptions({})).toEqual(defaultOptions); // We get the default options if we use an empty object.

    expect(RedisAdapter._defineOptions({
      url: 'redis_url'
    })).toEqual({
      connectionTimeout: 10000,
      operationTimeout: 5000,
      url: 'redis_url'
    }); // We get the merge of the provided and the default options.

    const opts = {
      host: 'host', port: 'port', db: 'db', pass: 'pass'
    };

    expect(RedisAdapter._defineOptions(opts)).not.toEqual(opts); // Provided options are not mutated.
    expect(opts).toEqual({ host: 'host', port: 'port', db: 'db', pass: 'pass' }); // Provided options are not mutated.

    expect(RedisAdapter._defineOptions(opts)).toEqual(merge({}, defaultOptions, opts)); // We get the merge of the provided and the default options.

    expect(RedisAdapter._defineOptions({
      random: 1,
      crap: 'I do not think I can make it',
      secret: 'shh',
      url: 'I will make it'
    })).toEqual(merge({}, defaultOptions, { url: 'I will make it' })); // Unwanted options will be skipped.
  });

  test('instance methods - _listenToEvents', (done) => {
    expect(ioredisMock.once).not.toBeCalled(); // Control assertion
    expect(ioredisMock[METHODS_TO_PROMISE_WRAP[0]]).not.toBeCalled(); // Control assertion

    const instance = new RedisAdapter(loggerMock, {
      url: 'redis://localhost:6379/0'
    });

    expect(ioredisMock.once).toBeCalledTimes(2); // If the method was called, it should have called the `once` function twice. If that it the case we can assume that the method was called on creation.

    // Reset stubs again, we'll check the behaviour calling the method directly.
    clearAllMocks();
    expect(ioredisMock.once).not.toBeCalled(); // Control assertion
    expect(ioredisMock[METHODS_TO_PROMISE_WRAP[METHODS_TO_PROMISE_WRAP.length - 1]]).not.toBeCalled(); // Control assertion

    instance._listenToEvents();

    expect(ioredisMock.once).toBeCalledTimes(2); // The "once" method of the instance should be called twice.

    const firstCallArgs = ioredisMock.once.mock.calls[0];

    expect(firstCallArgs[0]).toBe('ready'); // First argument for the first call should be the "ready" event.
    expect(typeof firstCallArgs[1]).toBe('function'); // second argument for the first call should be a callback function.

    const secondCallArgs = ioredisMock.once.mock.calls[1];

    expect(secondCallArgs[0]).toBe('close'); // First argument for the first call should be the "close" event.
    expect(typeof secondCallArgs[1]).toBe('function'); // second argument for the first call should be a callback function.

    expect(loggerMock.warn).not.toBeCalled(); // Control assertion
    secondCallArgs[1](); // Execute the callback for "close"

    expect(loggerMock.info).toBeCalledTimes(1); // The callback for the "close" event will only log info to the user about what is going on.
    expect(loggerMock.info.mock.calls[0]).toEqual([LOG_PREFIX + 'Redis connection closed.']); // The callback for the "close" event will only log info to the user about what is going on.

    loggerMock.info.mockClear();
    expect(loggerMock.info).not.toBeCalled(); // Control assertion
    expect(Array.isArray(instance._notReadyCommandsQueue)).toBe(true); // Control assertion

    // Without any offline commands queued, execute the callback for "ready"
    firstCallArgs[1]();

    expect(loggerMock.info).toBeCalledTimes(1); // The callback for the "ready" event will inform the user about the trigger.
    expect(loggerMock.info).toBeCalledWith(LOG_PREFIX + 'Redis connection established. Queued commands: 0.'); // The callback for the "ready" event will inform the user about the trigger.
    expect(instance._notReadyCommandsQueue).toBe(undefined); // After the DB is ready, it will clean up the offline commands queue so we do not queue commands anymore.

    // Don't do this at home
    const queuedGetCommand = {
      command: jest.fn(() => Promise.resolve()),
      name: 'GET',
      resolve: jest.fn(),
      reject: jest.fn()
    };
    const queuedSetCommand = {
      command: jest.fn(() => Promise.reject()),
      name: 'SET',
      resolve: jest.fn(),
      reject: jest.fn()
    };
    instance._notReadyCommandsQueue = [queuedGetCommand, queuedSetCommand];
    loggerMock.info.mockClear();

    // execute the callback for "ready" once more
    firstCallArgs[1]();

    expect(loggerMock.info).toBeCalledTimes(3); // If we had queued commands, it will log the event (1 call) as well as each executed command (n calls).
    expect(loggerMock.info.mock.calls).toEqual([
      [LOG_PREFIX + 'Redis connection established. Queued commands: 2.'], // The callback for the "ready" event will inform the user about the trigger and the amount of queued commands.
      [LOG_PREFIX + 'Executing queued GET command.'], // If we had queued, it will log the event as well as each executed command.
      [LOG_PREFIX + 'Executing queued SET command.'] // If we had queued commands, it will log the event as well as each executed command.
    ]);
    expect(queuedGetCommand.command).toBeCalledTimes(1); // It will execute each queued command.

    setTimeout(() => { // Remember this is tied to a promise.
      expect(queuedGetCommand.resolve).toBeCalled(); // And depending on what happens with the command promise, it will call the resolve or reject function for the promise wrapper.
      expect(queuedGetCommand.reject).not.toBeCalled(); // And depending on what happens with the command promise, it will call the resolve or reject function for the promise wrapper.
      expect(queuedSetCommand.reject).toBeCalled(); // And depending on what happens with the command promise, it will call the resolve or reject function for the promise wrapper.
      expect(queuedSetCommand.resolve).not.toBeCalled(); // And depending on what happens with the command promise, it will call the resolve or reject function for the promise wrapper.

      done();
    }, 5);
  });

  test('instance methods - _setTimeoutWrappers and queueing commands 1/2 - Error path', (done) => {

    const instance = new RedisAdapter(loggerMock, {
      url: 'redis://localhost:6379/0'
    });

    forEach(METHODS_TO_PROMISE_WRAP, methodName => {
      expect(instance[methodName]).not.toBe(ioredisMock[methodName]); // Method "${methodName}" from ioredis library should be wrapped.
      expect(ioredisMock[methodName]).not.toBeCalled(); // Checking that the method was not called yet.

      const startingQueueLength = instance._notReadyCommandsQueue.length;

      // We do have the commands queue on this state, so a call for this methods will queue the command.
      const wrapperResult = instance[methodName](methodName);
      expect(wrapperResult instanceof Promise).toBe(true); // The result is a promise since we are queueing commands on this state.

      expect(instance._notReadyCommandsQueue.length).toBe(startingQueueLength + 1); // The queue should have one more item.
      const queuedCommand = instance._notReadyCommandsQueue[0];

      expect(typeof queuedCommand.resolve).toBe('function'); // The queued item should have the correct form.
      expect(typeof queuedCommand.reject).toBe('function'); // The queued item should have the correct form.
      expect(typeof queuedCommand.command).toBe('function'); // The queued item should have the correct form.
      expect(queuedCommand.name).toBe(methodName.toUpperCase()); // The queued item should have the correct form.
    });

    instance._notReadyCommandsQueue = false; // Remove the queue.
    loggerMock.error.resetHistory;

    forEach(METHODS_TO_PROMISE_WRAP, (methodName, index) => {
      // We do NOT have the commands queue on this state, so a call for this methods will execute the command.
      expect(ioredisMock[methodName]).not.toBeCalled(); // Control assertion - Original method (${methodName}) was not called yet

      const previousTimeoutCalls = timeout.mock.calls.length;
      let previousRunningCommandsSize = instance._runningCommands.size;
      instance[methodName](methodName).catch(() => { }); // Swallow exception so it's not spread to logs.
      expect(ioredisMock[methodName]).toBeCalled(); // Original method (${methodName}) is called right away (through wrapper) when we are not queueing anymore.
      expect(instance._runningCommands.size).toBe(previousRunningCommandsSize + 1); // If the result of the operation was a thenable it will add the item to the running commands queue.

      expect(timeout).toBeCalledTimes(previousTimeoutCalls + 1); // The promise returned by the original method should have a timeout wrapper.

      // Get the original promise (the one passed to timeout)
      const commandTimeoutResolver = timeoutPromiseResolvers[0];

      expect(timeout.mock.calls[0]).toEqual([5000, commandTimeoutResolver.originalPromise]); // Timeout function should have received the correct ms amount and the right promise.
      expect(instance._runningCommands.has(commandTimeoutResolver.originalPromise)).toBe(true); // Correct promise should be the one on the _runningCommands queue.

      commandTimeoutResolver.rej('test');
      setTimeout(() => { // Allow the promises to tick.
        expect(instance._runningCommands.has(commandTimeoutResolver.originalPromise)).toBe(false); // After a command finishes with error, it's promise is removed from the instance._runningCommands queue.
        expect(loggerMock.error.mock.calls[index]).toEqual([`${LOG_PREFIX}${methodName} operation threw an error or exceeded configured timeout of 5000ms. Message: test`]); // The log error method should be called with the corresponding messages, depending on the method, error and operationTimeout.
      }, 0);
    });

    setTimeout(() => {
      done();
    }, 200);
  });

  test('instance methods - _setTimeoutWrappers and queueing commands 2/2 - Success path', (done) => {
    const instance = new RedisAdapter(loggerMock, {
      url: 'redis://localhost:6379/0'
    });

    instance._notReadyCommandsQueue = false; // Connection is "ready"

    forEach(METHODS_TO_PROMISE_WRAP, methodName => {
      // Just call the wrapped method, we don't care about all the paths tested on the previous case, just how it behaves when the command is resolved.
      instance[methodName](methodName);
      // Get the original promise (the one passed to timeout)
      const commandTimeoutResolver = timeoutPromiseResolvers[0];

      commandTimeoutResolver.res('test');
      setTimeout(() => { // Allow the promises to tick.
        expect(loggerMock.error).not.toBeCalled(); // No error should be logged
        expect(instance._runningCommands.has(commandTimeoutResolver.originalPromise)).toBe(false); // After a command finishes successfully, it's promise is removed from the instance._runningCommands queue.
      }, 0);
    });

    setTimeout(() => {
      done();
    }, 200);
  });

  test('instance methods - _setDisconnectWrapper', (done) => {
    const instance = new RedisAdapter(loggerMock, {
      url: 'redis://localhost:6379/0'
    });

    expect(instance.disconnect).not.toBe(ioredisMock.disconnect); // disconnect() method from redis library should be wrapped.

    // Call the method.
    // Note that there are no commands on the queue for this first run.
    instance.disconnect();
    expect(ioredisMock.disconnect).not.toBeCalled(); // Original method should not be called right away.

    setTimeout(() => { // o queued commands timeout wrapper.
      expect(loggerMock.debug.mock.calls).toEqual([[LOG_PREFIX + 'No commands pending execution, disconnect.']]);
      expect(ioredisMock.disconnect).toBeCalledTimes(1); // Original method should have been called once, asynchronously
      loggerMock.debug.mockClear();
      ioredisMock.disconnect.mockClear();

      // Second run, two pending commands, one will fail.
      instance._runningCommands.add(Promise.resolve());
      instance.disconnect();
      const rejectedPromise = Promise.reject('test-error');
      instance._runningCommands.add(rejectedPromise);
      rejectedPromise.catch(() => { }); // Swallow the unhandled to avoid unhandledRejection warns

      setTimeout(() => { // queued with rejection timeout wrapper
        expect(loggerMock.info.mock.calls).toEqual([[LOG_PREFIX + 'Attempting to disconnect but there are 2 commands still waiting for resolution. Defering disconnection until those finish.']]);

        Promise.all(setToArray(instance._runningCommands)).catch(e => {
          setImmediate(() => { // Allow the callback to execute before checking.
            expect(loggerMock.warn.mock.calls[0]).toEqual([`${LOG_PREFIX}Pending commands finished with error: ${e}. Proceeding with disconnection.`]); // Should warn about the error but tell user that will disconnect anyways.
            expect(ioredisMock.disconnect).toBeCalledTimes(1); // Original method should have been called once, asynchronously

            loggerMock.info.mockClear();
            loggerMock.warn.mockClear();
            ioredisMock.disconnect.mockClear();

            // Third run, pending commands all successful
            instance._runningCommands.clear();
            instance._runningCommands.add(Promise.resolve());
            instance._runningCommands.add(Promise.resolve());
            instance.disconnect();
            instance._runningCommands.add(Promise.resolve());
            instance._runningCommands.add(Promise.resolve());

            setTimeout(() => {
              expect(loggerMock.info.mock.calls).toEqual([[LOG_PREFIX + 'Attempting to disconnect but there are 4 commands still waiting for resolution. Defering disconnection until those finish.']]);

              Promise.all(setToArray(instance._runningCommands)).then(() => { // This one will go through success path
                setImmediate(() => {
                  expect(loggerMock.debug.mock.calls).toEqual([[LOG_PREFIX + 'Pending commands finished successfully, disconnecting.']]);
                  expect(ioredisMock.disconnect).toBeCalledTimes(1); // Original method should have been called once, asynchronously
                });
              });
            }, 10);
          });
        });
      }, 10);
    }, 10);

    setTimeout(() => {
      done();
    }, 400);
  });

});
