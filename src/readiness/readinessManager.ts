import { objectAssign } from '../utils/lang/objectAssign';
import { IEventEmitter } from '../types';
import { SDK_SPLITS_ARRIVED, SDK_SPLITS_CACHE_LOADED, SDK_SEGMENTS_ARRIVED, SDK_READY_TIMED_OUT, SDK_READY_FROM_CACHE, SDK_UPDATE, SDK_READY } from './constants';
import { IReadinessEventEmitter, IReadinessManager, ISegmentsEventEmitter, ISplitsEventEmitter } from './types';

function splitsEventEmitterFactory(EventEmitter: new () => IEventEmitter): ISplitsEventEmitter {
  const splitsEventEmitter = objectAssign(new EventEmitter(), {
    splitsArrived: false,
    splitsCacheLoaded: false,
  });

  // `isSplitKill` condition avoids an edge-case of wrongly emitting SDK_READY if:
  // - `/mySegments` fetch and SPLIT_KILL occurs before `/splitChanges` fetch, and
  // - storage has cached splits (for which case `splitsStorage.killLocally` can return true)
  splitsEventEmitter.on(SDK_SPLITS_ARRIVED, (isSplitKill: boolean) => { if (!isSplitKill) splitsEventEmitter.splitsArrived = true; });
  splitsEventEmitter.once(SDK_SPLITS_CACHE_LOADED, () => { splitsEventEmitter.splitsCacheLoaded = true; });

  return splitsEventEmitter;
}

function segmentsEventEmitterFactory(EventEmitter: new () => IEventEmitter): ISegmentsEventEmitter {
  const segmentsEventEmitter = objectAssign(new EventEmitter(), {
    segmentsArrived: false
  });

  segmentsEventEmitter.once(SDK_SEGMENTS_ARRIVED, () => { segmentsEventEmitter.segmentsArrived = true; });

  return segmentsEventEmitter;
}

/**
 * Factory of readiness manager, which handles the ready / update event propagation.
 */
export function readinessManagerFactory(
  EventEmitter: new () => IEventEmitter,
  readyTimeout = 0,
  splits: ISplitsEventEmitter = splitsEventEmitterFactory(EventEmitter)): IReadinessManager {

  const segments: ISegmentsEventEmitter = segmentsEventEmitterFactory(EventEmitter);
  const gate: IReadinessEventEmitter = new EventEmitter();

  // emit SDK_READY_FROM_CACHE
  let isReadyFromCache = false;
  if (splits.splitsCacheLoaded) isReadyFromCache = true; // ready from cache, but doesn't emit SDK_READY_FROM_CACHE
  else splits.once(SDK_SPLITS_CACHE_LOADED, checkIsReadyFromCache);

  // emit SDK_READY_TIMED_OUT
  let hasTimedout = false;

  function timeout() {
    if (hasTimedout) return;
    hasTimedout = true;
    gate.emit(SDK_READY_TIMED_OUT, 'Split SDK emitted SDK_READY_TIMED_OUT event.');
  }

  let readyTimeoutId: ReturnType<typeof setTimeout>;
  if (readyTimeout > 0) {
    readyTimeoutId = setTimeout(timeout, readyTimeout);
  }

  // emit SDK_READY and SDK_UPDATE
  let isReady = false;
  splits.on(SDK_SPLITS_ARRIVED, checkIsReadyOrUpdate);
  segments.on(SDK_SEGMENTS_ARRIVED, checkIsReadyOrUpdate);

  let isDestroyed = false;

  function checkIsReadyFromCache() {
    isReadyFromCache = true;
    // Don't emit SDK_READY_FROM_CACHE if SDK_READY has been emitted
    if (!isReady) {
      try {
        gate.emit(SDK_READY_FROM_CACHE);
      } catch (e) {
        // throws user callback exceptions in next tick
        setTimeout(() => { throw e; }, 0);
      }
    }
  }

  function checkIsReadyOrUpdate(diff: any) {
    if (isReady) {
      try {
        gate.emit(SDK_UPDATE, diff);
      } catch (e) {
        // throws user callback exceptions in next tick
        setTimeout(() => { throw e; }, 0);
      }
    } else {
      if (splits.splitsArrived && segments.segmentsArrived) {
        clearTimeout(readyTimeoutId);
        isReady = true;
        try {
          gate.emit(SDK_READY);
        } catch (e) {
          // throws user callback exceptions in next tick
          setTimeout(() => { throw e; }, 0);
        }
      }
    }
  }

  let refCount = 1;

  return {
    splits,
    segments,
    gate,

    shared(readyTimeout = 0) {
      refCount++;
      return readinessManagerFactory(EventEmitter, readyTimeout, splits);
    },

    timeout,

    destroy() {
      isDestroyed = true;

      segments.removeAllListeners();
      gate.removeAllListeners();
      clearTimeout(readyTimeoutId);

      if (refCount > 0) refCount--;
      if (refCount === 0) splits.removeAllListeners();
    },

    isReady() { return isReady; },
    hasTimedout() { return hasTimedout; },
    isReadyFromCache() { return isReadyFromCache; },
    isDestroyed() { return isDestroyed; },
    isOperational() { return (isReady || isReadyFromCache) && !isDestroyed; }
  };

}
