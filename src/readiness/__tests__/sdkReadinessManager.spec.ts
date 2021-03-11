// @ts-nocheck
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { IEventEmitter } from '../../types';
import { SDK_READY, SDK_READY_FROM_CACHE, SDK_READY_TIMED_OUT, SDK_UPDATE } from '../constants';
import sdkReadinessManagerFactory from '../sdkReadinessManager';
import { IReadinessManager } from '../types';

const EventEmitterMock = jest.fn(() => ({
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  addListener: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn()
})) as new () => IEventEmitter;

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

    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);
    expect(typeof sdkReadinessManager).toBe('object'); // The function result contains the readiness manager and a sdkStatus object.
    const gateMock = sdkReadinessManager.readinessManager.gate;
    const sdkStatus = sdkReadinessManager.sdkStatus;

    Object.keys(new EventEmitterMock()).forEach(propName => {
      expect(sdkStatus[propName]).toBeTruthy(); // The sdkStatus exposes all minimal EventEmitter functionality.
    });

    expect(typeof sdkStatus['ready']).toBe('function'); // The sdkStatus exposes a .ready() function.

    expect(typeof sdkStatus.Event).toBe('object'); // It also exposes the Event map,
    expect(sdkStatus.Event.SDK_READY).toBe(SDK_READY); // which contains the constants for the events, for backwards compatibility.
    expect(sdkStatus.Event.SDK_READY_FROM_CACHE).toBe(SDK_READY_FROM_CACHE); // which contains the constants for the events, for backwards compatibility.
    expect(sdkStatus.Event.SDK_READY_TIMED_OUT).toBe(SDK_READY_TIMED_OUT); // which contains the constants for the events, for backwards compatibility.
    expect(sdkStatus.Event.SDK_UPDATE).toBe(SDK_UPDATE); // which contains the constants for the events, for backwards compatibility.

    expect(gateMock.once.mock.calls.length).toBe(3); // It should make three one time only subscriptions

    const sdkReadyResolvePromiseCall = gateMock.once.mock.calls[0];
    const sdkReadyRejectPromiseCall = gateMock.once.mock.calls[1];
    const sdkReadyFromCacheListenersCheckCall = gateMock.once.mock.calls[2];
    expect(sdkReadyResolvePromiseCall[0]).toBe(SDK_READY); // A one time only subscription is on the SDK_READY event, for resolving the full blown ready promise and to check for callbacks warning.
    expect(sdkReadyRejectPromiseCall[0]).toBe(SDK_READY_TIMED_OUT); // A one time only subscription is also on the SDK_READY_TIMED_OUT event, for rejecting the full blown ready promise.
    expect(sdkReadyFromCacheListenersCheckCall[0]).toBe(SDK_READY_FROM_CACHE); // A one time only subscription is on the SDK_READY_FROM_CACHE event, to log the event and update internal state.

    expect(gateMock.on.mock.calls.length).toBe(2); // It should also add two persistent listeners

    const removeListenerSubCall = gateMock.on.mock.calls[0];
    const addListenerSubCall = gateMock.on.mock.calls[1];

    expect(removeListenerSubCall[0]).toBe('removeListener'); // First subscription should be made to the removeListener event.
    expect(addListenerSubCall[0]).toBe('newListener'); // Second subscription should be made to the newListener event, after the removeListener one so we avoid an unnecessary trigger.
  });

  test('The event callbacks should work as expected - SDK_READY_FROM_CACHE', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);
    const gateMock = sdkReadinessManager.readinessManager.gate;

    const readyFromCacheEventCB = gateMock.once.mock.calls[2][1];
    readyFromCacheEventCB();
    expect(loggerMock.info.mock.calls.length).toBe(1); // If the SDK_READY_FROM_CACHE event fires, we get a info message.
    expect(loggerMock.info.mock.calls[0]).toEqual(['Split SDK is ready from cache.']); // Telling us the SDK is ready to be used with data from cache.
  });

  test('The event callbacks should work as expected - SDK_READY emits with no callbacks', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);

    // Get the callbacks
    const addListenerCB = sdkReadinessManager.readinessManager.gate.on.mock.calls[1][1];

    emitReadyEvent(sdkReadinessManager.readinessManager);

    expect(loggerMock.warn.mock.calls.length).toBe(1); // If the SDK_READY event fires and we have no callbacks for it (neither event nor ready promise) we get a warning.
    expect(loggerMock.warn.mock.calls[0]).toEqual(['No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.']); // Telling us there were no listeners and evaluations before this point may have been incorrect.

    expect(loggerMock.info.mock.calls.length).toBe(1); // If the SDK_READY event fires, we get a info message.
    expect(loggerMock.info.mock.calls[0]).toEqual(['Split SDK is ready.']); // Telling us the SDK is ready.

    // Now it's marked as ready.
    addListenerCB('this event we do not care');
    expect(loggerMock.error.mock.calls.length).toBe(0); // Now if we add a listener to an event unrelated with readiness, we get no errors logged.

    addListenerCB(SDK_READY);
    expect(loggerMock.error.mock.calls).toEqual([['A listener was added for SDK_READY on the SDK, which has already fired and won\'t be emitted again. The callback won\'t be executed.']]); // If we try to add a listener to SDK_READY we get the corresponding warning.

    loggerMock.error.mockClear();
    addListenerCB(SDK_READY_TIMED_OUT);
    expect(loggerMock.error.mock.calls).toEqual([['A listener was added for SDK_READY_TIMED_OUT on the SDK, which has already fired and won\'t be emitted again. The callback won\'t be executed.']]); // If we try to add a listener to SDK_READY_TIMED_OUT we get the corresponding warning.
  });

  test('The event callbacks should work as expected - SDK_READY emits with callbacks', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);

    // Get the callbacks
    const addListenerCB = sdkReadinessManager.readinessManager.gate.on.mock.calls[1][1];

    addListenerCB(SDK_READY);
    expect(loggerMock.warn.mock.calls.length).toBe(0); // We are adding a listener to the ready event before it is ready, so no warnings are logged.
    expect(loggerMock.error.mock.calls.length).toBe(0); // We are adding a listener to the ready event before it is ready, so no errors are logged.

    emitReadyEvent(sdkReadinessManager.readinessManager);
    expect(loggerMock.warn.mock.calls.length).toBe(0); // As we had at least one listener, we get no warnings.
    expect(loggerMock.error.mock.calls.length).toBe(0); // As we had at least one listener, we get no errors.

    expect(loggerMock.info.mock.calls.length).toBe(1); // If the SDK_READY event fires, we get a info message.
    expect(loggerMock.info.mock.calls[0]).toEqual(['Split SDK is ready.']); // Telling us the SDK is ready.
  });

  test('The event callbacks should work as expected - If we end up removing the listeners for SDK_READY, it behaves as if it had none', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);
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
    expect(loggerMock.warn.mock.calls[0]).toEqual(['No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.']); // We get the warning.
  });

  test('The event callbacks should work as expected - If we end up removing the listeners for SDK_READY, it behaves as if it had none', () => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);
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
    expect(loggerMock.warn.mock.calls.length).toBe(0); // No warning when the SDK is ready as we still have one listener.
  });

  test('The event callbacks should work as expected - SDK_READY emits with expected internal callbacks', () => {
    // the sdkReadinessManager expects more than one SDK_READY callback to not log the "No listeners" warning
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock, undefined /* default readyTimeout */, 1 /* internalReadyCbCount */);
    const gateMock = sdkReadinessManager.readinessManager.gate;

    // Get the callbacks
    const removeListenerCB = gateMock.on.mock.calls[0][1];
    const addListenerCB = gateMock.on.mock.calls[1][1];

    // Fake adding two listeners and removing one
    addListenerCB(SDK_READY);
    addListenerCB(SDK_READY);
    removeListenerCB(SDK_READY);

    expect(loggerMock.warn.mock.calls.length).toBe(0); // We are adding/removing listeners to the ready event before it is ready, so no warnings are logged.
    expect(loggerMock.error.mock.calls.length).toBe(0); // We are adding/removing listeners to the ready event before it is ready, so no errors are logged.

    emitReadyEvent(sdkReadinessManager.readinessManager);
    expect(loggerMock.warn.mock.calls.length).not.toBe(0); // As we had the same amount of listeners that the expected, we get a warning.
    expect(loggerMock.error.mock.calls.length).toBe(0); // As we had at least one listener, we get no errors.
  });
});

describe('SDK Readiness Manager - Ready promise', () => {

  test('.ready() promise behaviour for clients', async (done) => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);

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

    const sdkReadinessManagerForTimedout = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);

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
        done();
      },
      () => { throw new Error('It should be resolved on ready event, not rejected.'); }
    );
  });

  test('Full blown ready promise count as a callback and resolves on SDK_READY', (done) => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);
    const readyPromise = sdkReadinessManager.sdkStatus.ready();

    // Get the callback
    const readyEventCB = sdkReadinessManager.readinessManager.gate.once.mock.calls[0][1];

    readyEventCB();
    expect(loggerMock.warn.mock.calls).toEqual([['No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.']]); // We would get the warning if the SDK get\'s ready before attaching any callbacks to ready promise.
    loggerMock.warn.mockClear();

    readyPromise.then(() => {
      expect('The ready promise is resolved when the gate emits SDK_READY.');
      done();
    }, () => {
      throw new Error('This should not be called as the promise is being resolved.');
    });

    readyEventCB();
    expect(loggerMock.warn.mock.calls.length).toBe(0); // But if we have a listener there are no warnings.
  });

  test('.ready() rejected promises have a default onRejected handler that just logs the error', (done) => {
    const sdkReadinessManager = sdkReadinessManagerFactory(loggerMock, EventEmitterMock);
    let readyForTimeout = sdkReadinessManager.sdkStatus.ready();

    emitTimeoutEvent(sdkReadinessManager.readinessManager); // make the SDK "timed out"

    readyForTimeout.then(
      () => { throw new Error('It should be a promise that was rejected on SDK_READY_TIMED_OUT, not resolved.'); }
    );

    expect(loggerMock.error.mock.calls.length === 0).toBe(true); // not called until promise is rejected

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
            expect(error).toBe('Split SDK has emitted SDK_READY_TIMED_OUT event.');
            expect(loggerMock.error).toBeCalledTimes(2); // If we provide an onRejected handler, even chaining several onFulfilled handlers, the error is not logged.
            done();
          });
      }, 0);
    }, 0);
  });
});
