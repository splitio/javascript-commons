import { readinessManagerFactory } from '../readinessManager';
import { EventEmitter } from '../../utils/MinEvents';
import { IReadinessManager } from '../types';
import { SDK_READY, SDK_UPDATE, SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED, SDK_READY_FROM_CACHE, SDK_SPLITS_CACHE_LOADED, SDK_READY_TIMED_OUT } from '../constants';

const timeoutMs = 100;
const statusFlagsCount = 7;

function assertInitialStatus(readinessManager: IReadinessManager) {
  expect(readinessManager.isReady()).toBe(false);
  expect(readinessManager.isReadyFromCache()).toBe(false);
  expect(readinessManager.isTimedout()).toBe(false);
  expect(readinessManager.hasTimedout()).toBe(false);
  expect(readinessManager.isDestroyed()).toBe(false);
  expect(readinessManager.isOperational()).toBe(false);
  expect(readinessManager.lastUpdate()).toBe(0);
}

test('READINESS MANAGER / Share splits but segments (without timeout enabled)', (done) => {
  expect.assertions(2 + statusFlagsCount * 2);

  const readinessManager = readinessManagerFactory(EventEmitter);
  const readinessManager2 = readinessManager.shared();

  assertInitialStatus(readinessManager); // all status flags must be false
  assertInitialStatus(readinessManager2);

  readinessManager.gate.on(SDK_READY, () => {
    expect(readinessManager.isReady()).toBe(true);
  }).on(SDK_UPDATE, () => {
    throw new Error('should not be called');
  });

  readinessManager2.gate.on(SDK_READY, () => {
    expect(readinessManager2.isReady()).toBe(true);
  }).on(SDK_UPDATE, () => {
    throw new Error('should not be called');
  });

  // Simulate state transitions
  setTimeout(() => {
    readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  }, 1000 * Math.random());
  setTimeout(() => {
    readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
  }, 1000 * Math.random());
  setTimeout(() => {
    readinessManager2.segments.emit(SDK_SEGMENTS_ARRIVED);
  }, 1000 * Math.random());

  setTimeout(done, 1100);
});

test('READINESS MANAGER / Ready event should be fired once', () => {
  const readinessManager = readinessManagerFactory(EventEmitter);
  let counter = 0;

  readinessManager.gate.on(SDK_READY, () => {
    expect(readinessManager.isReady()).toBe(true);
    counter++;
  });

  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);

  expect(counter).toBe(1); // should be called once
});

test('READINESS MANAGER / Ready from cache event should be fired once', (done) => {
  const readinessManager = readinessManagerFactory(EventEmitter);
  let counter = 0;

  readinessManager.gate.on(SDK_READY_FROM_CACHE, () => {
    expect(readinessManager.isReadyFromCache()).toBe(true);
    counter++;
  });

  readinessManager.splits.emit(SDK_SPLITS_CACHE_LOADED);
  readinessManager.splits.emit(SDK_SPLITS_CACHE_LOADED);
  setTimeout(() => {
    readinessManager.splits.emit(SDK_SPLITS_CACHE_LOADED);
  }, 0);
  readinessManager.splits.emit(SDK_SPLITS_CACHE_LOADED);
  readinessManager.splits.emit(SDK_SPLITS_CACHE_LOADED);
  readinessManager.splits.emit(SDK_SPLITS_CACHE_LOADED);
  readinessManager.splits.emit(SDK_SPLITS_CACHE_LOADED);

  setTimeout(() => {
    expect(counter).toBe(1); // should be called only once
    done();
  }, 20);
});

test('READINESS MANAGER / Update event should be fired after the Ready event', () => {
  const readinessManager = readinessManagerFactory(EventEmitter);
  let isReady = false;
  let counter = 0;

  readinessManager.gate.on(SDK_READY, () => {
    counter++;
    isReady = true;
  });

  readinessManager.gate.on(SDK_UPDATE, () => {
    isReady && counter++;
  });

  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);

  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);

  expect(counter).toBe(5); // should count 1 ready plus 4 updates
});

test('READINESS MANAGER / Segment updates should not be propagated', (done) => {
  let updateCounter = 0;

  const readinessManager = readinessManagerFactory(EventEmitter);
  const readinessManager2 = readinessManager.shared();

  readinessManager2.gate.on(SDK_UPDATE, () => {
    updateCounter++;
  });

  readinessManager.gate.on(SDK_UPDATE, () => {
    throw new Error('should not be called');
  });

  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager2.segments.emit(SDK_SEGMENTS_ARRIVED);
  readinessManager2.segments.emit(SDK_SEGMENTS_ARRIVED);
  readinessManager2.segments.emit(SDK_SEGMENTS_ARRIVED);

  setTimeout(() => {
    expect(updateCounter).toBe(2);
    done();
  });
});

describe('READINESS MANAGER / Timeout ready event', () => {
  let readinessManager: IReadinessManager;
  let timeoutCounter: number;

  beforeEach(() => {
    // Schedule timeout to be fired before SDK_READY
    readinessManager = readinessManagerFactory(EventEmitter, 10);
    timeoutCounter = 0;

    readinessManager.gate.on(SDK_READY_TIMED_OUT, () => {
      expect(readinessManager.isTimedout()).toBe(true);
      expect(readinessManager.hasTimedout()).toBe(true);
      if (!readinessManager.isReady()) timeoutCounter++;
    });

    setTimeout(() => {
      readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
      readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
    }, 20);
  });

  test('should be fired once', (done) => {
    readinessManager.gate.on(SDK_READY, () => {
      expect(readinessManager.isReady()).toBe(true);
      expect(readinessManager.isTimedout()).toBe(false);
      expect(readinessManager.hasTimedout()).toBe(true);
      expect(timeoutCounter).toBe(1);
      done();
    });

    readinessManager.gate.on(SDK_READY_TIMED_OUT, () => {
      // Calling timeout again should not re-trigger the event
      readinessManager.timeout();
      setTimeout(readinessManager.timeout);
    });
  });

  test('should be fired once if called explicitly', (done) => {
    readinessManager.gate.on(SDK_READY, () => {
      expect(readinessManager.isReady()).toBe(true);
      expect(timeoutCounter).toBe(1);
      done();
    });

    // Calling timeout multiple times triggers the event only once
    readinessManager.timeout();
    setTimeout(readinessManager.timeout);
  });
});

test('READINESS MANAGER / Cancel timeout if ready fired', (done) => {
  let sdkReadyCalled = false;
  let sdkReadyTimedoutCalled = false;

  const readinessManager = readinessManagerFactory(EventEmitter, timeoutMs);

  readinessManager.gate.on(SDK_READY_TIMED_OUT, () => { sdkReadyTimedoutCalled = true; });
  readinessManager.gate.once(SDK_READY, () => { sdkReadyCalled = true; });

  setTimeout(() => {
    // After a considerably longer time than the timeout, the timeout event never fired.
    expect(sdkReadyTimedoutCalled).toBeFalsy();
    expect(sdkReadyCalled).toBeTruthy();
    done();
  }, timeoutMs * 3);

  setTimeout(() => {
    readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
    readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED);
  }, timeoutMs * 0.8);
});

test('READINESS MANAGER / Destroy after it was ready but before timedout', () => {
  const readinessManager = readinessManagerFactory(EventEmitter, timeoutMs);

  let counter = 0;

  readinessManager.gate.on(SDK_UPDATE, () => {
    counter++;
  });

  let lastUpdate = readinessManager.lastUpdate();
  expect(lastUpdate).toBe(0);

  readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED); // ready state

  expect(readinessManager.lastUpdate()).toBeGreaterThan(lastUpdate);
  lastUpdate = readinessManager.lastUpdate();

  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED); // fires an update
  expect(readinessManager.lastUpdate()).toBeGreaterThan(lastUpdate);
  lastUpdate = readinessManager.lastUpdate();

  expect(readinessManager.isDestroyed()).toBe(false);
  readinessManager.destroy(); // Destroy the gate, removing all the listeners and clearing the ready timeout.
  expect(readinessManager.isDestroyed()).toBe(true);
  expect(readinessManager.lastUpdate()).toBeGreaterThan(lastUpdate);

  readinessManager.destroy(); // no-op
  readinessManager.destroy(); // no-op

  readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED); // the update is not fired after destroyed

  expect(counter).toBe(1); // Second update event should be discarded
});

test('READINESS MANAGER / Destroy before it was ready and timedout', (done) => {
  const readinessManager = readinessManagerFactory(EventEmitter, timeoutMs);

  readinessManager.gate.on(SDK_READY, () => {
    throw new Error('SDK_READY should have not been emitted');
  });

  readinessManager.gate.on(SDK_READY_TIMED_OUT, () => {
    throw new Error('SDK_READY_TIMED_OUT should have not been emitted');
  });

  setTimeout(() => {
    readinessManager.destroy(); // Destroy the gate, removing all the listeners and clearing the ready timeout.
  }, timeoutMs * 0.5);

  setTimeout(() => {
    readinessManager.splits.emit(SDK_SPLITS_ARRIVED);
    readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED); // ready state if the readiness manager wasn't destroyed

    expect('Calling destroy should have removed the readyTimeout and the test should end now.');
    done();
  }, timeoutMs * 1.5);

});
