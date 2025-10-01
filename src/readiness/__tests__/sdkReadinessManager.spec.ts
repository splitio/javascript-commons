// @ts-nocheck
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import SplitIO from '../../../types/splitio';
import { SDK_READY, SDK_READY_FROM_CACHE, SDK_READY_TIMED_OUT, SDK_UPDATE } from '../constants';
import { sdkReadinessManagerFactory } from '../sdkReadinessManager';
import { IReadinessManager } from '../types';
import { ERROR_CLIENT_LISTENER, CLIENT_READY_FROM_CACHE, CLIENT_READY, CLIENT_NO_LISTENER } from '../../logger/constants';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

const EventEmitterMock = jest.fn(() => ({
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  addListener: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn()
})) as new () => SplitIO.IEventEmitter;

// Makes readinessManager emit SDK_READY & update isReady flag
function emitReadyEvent(readinessManager: IReadinessManager) {
  readinessManager.splits.once.mock.calls[0][1]();
  readinessManager.splits.on.mock.calls[0][1]();
  readinessManager.segments.once.mock.calls[0][1]();
  readinessManager.segments.on.mock.calls[0][1]();
  readinessManager.gate.once.mock.calls[0][1]();
}

const timeoutErrorMessage = 'Split SDK emitted SDK_READY_TIMED_OUT event.';

// Makes readinessManager emit SDK_READY_TIMED_OUT & update hasTimedout flag
function emitTimeoutEvent(readinessManager: IReadinessManager) {
  readinessManager.gate.once.mock.calls[1][1](timeoutErrorMessage);
  readinessManager.hasTimedout = () => true;
}

describe('SDK Readiness Manager - Event emitter', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Providing the gate object to get the SDK status interface that manages events', () => {
    expect(typeof sdkReadinessManagerFactory).toBe('function'); // The module exposes a function.

    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);
    expect(typeof sdkReadinessManager).toBe('object'); // The function result contains the readiness manager and a sdkStatus object.
    const gateMock = sdkReadinessManager.readinessManager.gate;
    const sdkStatus = sdkReadinessManager.sdkStatus;

    Object.keys(new EventEmitterMock()).forEach(propName => {
      expect(sdkStatus[propName]).toBeTruthy(); // The sdkStatus exposes all minimal EventEmitter functionality.
    });

    expect(typeof sdkStatus.ready).toBe('function'); // The sdkStatus exposes a .ready() function.
    expect(typeof sdkStatus.getStatus).toBe('function'); // The sdkStatus exposes a .getStatus() function.
    expect(sdkStatus.getStatus()).toEqual({
      isReady: false, isReadyFromCache: false, isTimedout: false, hasTimedout: false, isDestroyed: false, isOperational: false, lastUpdate: 0
    });

    expect(typeof sdkStatus.Event).toBe('object'); // It also exposes the Event map,
    expect(sdkStatus.Event.SDK_READY).toBe(SDK_READY); // which contains the constants for the events, for backwards compatibility.
    expect(sdkStatus.Event.SDK_READY_FROM_CACHE).toBe(SDK_READY_FROM_CACHE); // which contains the constants for the events, for backwards compatibility.
    expect(sdkStatus.Event.SDK_READY_TIMED_OUT).toBe(SDK_READY_TIMED_OUT); // which contains the constants for the events, for backwards compatibility.
    expect(sdkStatus.Event.SDK_UPDATE).toBe(SDK_UPDATE); // which contains the constants for the events, for backwards compatibility.

    expect(gateMock.once).toBeCalledTimes(3); // It should make three one time only subscriptions

    const sdkReadyResolvePromiseCall = gateMock.once.mock.calls[0];
    const sdkReadyRejectPromiseCall = gateMock.once.mock.calls[1];
    const sdkReadyFromCacheListenersCheckCall = gateMock.once.mock.calls[2];
    expect(sdkReadyResolvePromiseCall[0]).toBe(SDK_READY); // A one time only subscription is on the SDK_READY event, for resolving the full blown ready promise and to check for callbacks warning.
    expect(sdkReadyRejectPromiseCall[0]).toBe(SDK_READY_TIMED_OUT); // A one time only subscription is also on the SDK_READY_TIMED_OUT event, for rejecting the full blown ready promise.
    expect(sdkReadyFromCacheListenersCheckCall[0]).toBe(SDK_READY_FROM_CACHE); // A one time only subscription is on the SDK_READY_FROM_CACHE event, to log the event and update internal state.

    expect(gateMock.on).toBeCalledTimes(2); // It should also add two persistent listeners

    const removeListenerSubCall = gateMock.on.mock.calls[0];
    const addListenerSubCall = gateMock.on.mock.calls[1];

    expect(removeListenerSubCall[0]).toBe('removeListener'); // First subscription should be made to the removeListener event.
    expect(addListenerSubCall[0]).toBe('newListener'); // Second subscription should be made to the newListener event, after the removeListener one so we avoid an unnecessary trigger.
  });

  test('The event callbacks should work as expected - SDK_READY_FROM_CACHE', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);
    const gateMock = sdkReadinessManager.readinessManager.gate;

    const readyFromCacheEventCB = gateMock.once.mock.calls[2][1];
    readyFromCacheEventCB();
    expect(loggerMock.info).toBeCalledTimes(1); // If the SDK_READY_FROM_CACHE event fires, we get a info message.
    expect(loggerMock.info).toBeCalledWith(CLIENT_READY_FROM_CACHE); // Telling us the SDK is ready to be used with data from cache.
  });

  test('The event callbacks should work as expected - SDK_READY emits with no callbacks', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);

    // Get the callbacks
    const addListenerCB = sdkReadinessManager.readinessManager.gate.on.mock.calls[1][1];

    emitReadyEvent(sdkReadinessManager.readinessManager);

    expect(loggerMock.warn).toBeCalledTimes(1); // If the SDK_READY event fires and we have no callbacks for it (neither event nor ready promise) we get a warning.
    expect(loggerMock.warn).toBeCalledWith(CLIENT_NO_LISTENER); // Telling us there were no listeners and evaluations before this point may have been incorrect.

    expect(loggerMock.info).toBeCalledTimes(1); // If the SDK_READY event fires, we get a info message.
    expect(loggerMock.info).toBeCalledWith(CLIENT_READY); // Telling us the SDK is ready.

    // Now it's marked as ready.
    addListenerCB('this event we do not care');
    expect(loggerMock.error).not.toBeCalled(); // Now if we add a listener to an event unrelated with readiness, we get no errors logged.

    addListenerCB(SDK_READY);
    expect(loggerMock.error).toBeCalledWith(ERROR_CLIENT_LISTENER, ['SDK_READY']); // If we try to add a listener for the already emitted SDK_READY event, we get the corresponding error.

    loggerMock.error.mockClear();
    addListenerCB(SDK_READY_TIMED_OUT);
    expect(loggerMock.error).toBeCalledWith(ERROR_CLIENT_LISTENER, ['SDK_READY_TIMED_OUT']); // If we try to add a listener for the already emitted SDK_READY_TIMED_OUT event, we get the corresponding error.
  });

  test('The event callbacks should work as expected - SDK_READY emits with callbacks', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);

    // Get the callbacks
    const addListenerCB = sdkReadinessManager.readinessManager.gate.on.mock.calls[1][1];

    addListenerCB(SDK_READY);
    expect(loggerMock.warn).not.toBeCalled(); // We are adding a listener to the ready event before it is ready, so no warnings are logged.
    expect(loggerMock.error).not.toBeCalled(); // We are adding a listener to the ready event before it is ready, so no errors are logged.

    emitReadyEvent(sdkReadinessManager.readinessManager);
    expect(loggerMock.warn).not.toBeCalled(); // As we had at least one listener, we get no warnings.
    expect(loggerMock.error).not.toBeCalled(); // As we had at least one listener, we get no errors.

    expect(loggerMock.info).toBeCalledTimes(1); // If the SDK_READY event fires, we get a info message.
    expect(loggerMock.info).toBeCalledWith(CLIENT_READY); // Telling us the SDK is ready.
  });

  test('The event callbacks should work as expected - If we end up removing the listeners for SDK_READY, it behaves as if it had none', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);
    const gateMock = sdkReadinessManager.readinessManager.gate;

    // Get the callbacks
    const addListenerCB = gateMock.on.mock.calls[1][1];
    const removeListenerCB = gateMock.on.mock.calls[0][1];

    // Fake adding two listeners
    addListenerCB(SDK_READY);
    addListenerCB(SDK_READY);

    // And then fake remove them.
    removeListenerCB(SDK_READY);
    removeListenerCB(SDK_READY);

    emitReadyEvent(sdkReadinessManager.readinessManager);
    expect(loggerMock.warn).toBeCalledWith(CLIENT_NO_LISTENER); // We get the warning.
  });

  test('The event callbacks should work as expected - If we end up removing the listeners for SDK_READY, it behaves as if it had none', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);
    const gateMock = sdkReadinessManager.readinessManager.gate;

    // Get the callbacks
    const removeListenerCB = gateMock.on.mock.calls[0][1];
    const addListenerCB = gateMock.on.mock.calls[1][1];

    // Fake adding two listeners
    addListenerCB(SDK_READY);
    addListenerCB(SDK_READY);

    // And then fake remove only one of them. The rest are events that we don't care about so it should not affect the count.
    removeListenerCB(SDK_READY);
    removeListenerCB(SDK_READY_TIMED_OUT);
    removeListenerCB('random event');

    emitReadyEvent(sdkReadinessManager.readinessManager);
    expect(loggerMock.warn).not.toBeCalled(); // No warning when the SDK is ready as we still have one listener.
  });

  test('The event callbacks should work as expected - SDK_READY emits with expected internal callbacks', () => {
    // the sdkReadinessManager expects more than one SDK_READY callback to not log the "No listeners" warning
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);
    sdkReadinessManager.incInternalReadyCbCount();
    const gateMock = sdkReadinessManager.readinessManager.gate;

    // Get the callbacks
    const removeListenerCB = gateMock.on.mock.calls[0][1];
    const addListenerCB = gateMock.on.mock.calls[1][1];

    // Fake adding two listeners and removing one
    addListenerCB(SDK_READY);
    addListenerCB(SDK_READY);
    removeListenerCB(SDK_READY);

    expect(loggerMock.warn).not.toBeCalled(); // We are adding/removing listeners to the ready event before it is ready, so no warnings are logged.
    expect(loggerMock.error).not.toBeCalled(); // We are adding/removing listeners to the ready event before it is ready, so no errors are logged.

    emitReadyEvent(sdkReadinessManager.readinessManager);
    expect(loggerMock.warn).toBeCalled(); // As we had the same amount of listeners that the expected, we get a warning.
    expect(loggerMock.error).not.toBeCalled(); // As we had at least one listener, we get no errors.
  });
});

describe('SDK Readiness Manager - Ready promise', () => {

  test('.ready() promise behavior for clients', async () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);

    const ready = sdkReadinessManager.sdkStatus.ready();
    expect(ready instanceof Promise).toBe(true); // It should return a promise.

    // make the SDK "ready"
    emitReadyEvent(sdkReadinessManager.readinessManager);

    let testPassedCount = 0;
    await ready.then(
      () => {
        expect('It should be a promise that will be resolved when the SDK is ready.');
        testPassedCount++;
      },
      () => { throw new Error('It should be resolved on ready event, not rejected.'); }
    );

    // any subsequent call to .ready() must be a resolved promise
    await ready.then(
      () => {
        expect('A subsequent call should be a resolved promise.');
        testPassedCount++;
      },
      () => { throw new Error('It should be resolved on ready event, not rejected.'); }
    );

    // control assertion. stubs already reset.
    expect(testPassedCount).toBe(2);

    const sdkReadinessManagerForTimedout = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);

    const readyForTimeout = sdkReadinessManagerForTimedout.sdkStatus.ready();

    emitTimeoutEvent(sdkReadinessManagerForTimedout.readinessManager); // make the SDK "timed out"

    await readyForTimeout.then(
      () => { throw new Error('It should be a promise that was rejected on SDK_READY_TIMED_OUT, not resolved.'); },
      () => {
        expect('It should be a promise that will be rejected when the SDK is timed out.');
        testPassedCount++;
      }
    );

    // any subsequent call to .ready() must be a rejected promise
    await readyForTimeout.then(
      () => { throw new Error('It should be a promise that was rejected on SDK_READY_TIMED_OUT, not resolved.'); },
      () => {
        expect('A subsequent call should be a rejected promise.');
        testPassedCount++;
      }
    );

    // make the SDK "ready"
    emitReadyEvent(sdkReadinessManagerForTimedout.readinessManager);

    // once SDK_READY, `.ready()` returns a resolved promise
    await ready.then(
      () => {
        expect('It should be a resolved promise when the SDK is ready, even after an SDK timeout.');
        loggerMock.mockClear();
        testPassedCount++;
        expect(testPassedCount).toBe(5);
      },
      () => { throw new Error('It should be resolved on ready event, not rejected.'); }
    );
  });

  test('Full blown ready promise count as a callback and resolves on SDK_READY', (done) => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);
    const readyPromise = sdkReadinessManager.sdkStatus.ready();

    // Get the callback
    const readyEventCB = sdkReadinessManager.readinessManager.gate.once.mock.calls[0][1];

    readyEventCB();
    expect(loggerMock.warn).toBeCalledWith(CLIENT_NO_LISTENER); // We would get the warning if the SDK get\'s ready before attaching any callbacks to ready promise.
    loggerMock.warn.mockClear();

    readyPromise.then(() => {
      expect('The ready promise is resolved when the gate emits SDK_READY.');
      done();
    }, () => {
      throw new Error('This should not be called as the promise is being resolved.');
    });

    readyEventCB();
    expect(loggerMock.warn).not.toBeCalled(); // But if we have a listener there are no warnings.
  });

  test('.ready() rejected promises have a default onRejected handler that just logs the error', (done) => {
    const sdkReadinessManager = sdkReadinessManagerFactory(EventEmitterMock, fullSettings);
    let readyForTimeout = sdkReadinessManager.sdkStatus.ready();

    emitTimeoutEvent(sdkReadinessManager.readinessManager); // make the SDK "timed out"

    readyForTimeout.then(
      () => { throw new Error('It should be a promise that was rejected on SDK_READY_TIMED_OUT, not resolved.'); }
    );

    expect(loggerMock.error).not.toBeCalled(); // not called until promise is rejected

    setTimeout(() => {
      expect(loggerMock.error.mock.calls).toEqual([[timeoutErrorMessage]]); // If we don\'t handle the rejected promise, an error is logged.
      readyForTimeout = sdkReadinessManager.sdkStatus.ready();

      setTimeout(() => {
        expect(loggerMock.error).lastCalledWith('Split SDK has emitted SDK_READY_TIMED_OUT event.'); // If we don\'t handle a new .ready() rejected promise, an error is logged.
        readyForTimeout = sdkReadinessManager.sdkStatus.ready();

        readyForTimeout
          .then(() => { throw new Error(); })
          .then(() => { throw new Error(); })
          .catch((error) => {
            expect(error instanceof Error).toBe(true);
            expect(error.message).toBe('Split SDK has emitted SDK_READY_TIMED_OUT event.');
            expect(loggerMock.error).toBeCalledTimes(2); // If we provide an onRejected handler, even chaining several onFulfilled handlers, the error is not logged.
            done();
          });
      }, 0);
    }, 0);
  });
});
