import { objectAssign } from '../utils/lang/objectAssign';
import { ISettings } from '../types';
import SplitIO from '../../types/splitio';
import { SDK_SPLITS_ARRIVED, SDK_SPLITS_CACHE_LOADED, SDK_SEGMENTS_ARRIVED, SDK_READY_TIMED_OUT, SDK_READY_FROM_CACHE, SDK_UPDATE, SDK_READY } from './constants';
import { IReadinessEventEmitter, IReadinessManager, ISegmentsEventEmitter, ISplitsEventEmitter } from './types';

function splitsEventEmitterFactory(EventEmitter: new () => SplitIO.IEventEmitter): ISplitsEventEmitter {
  const splitsEventEmitter = objectAssign(new EventEmitter(), {
    splitsArrived: false,
    splitsCacheLoaded: false,
    hasInit: false,
    initCallbacks: []
  });

  // `isSplitKill` condition avoids an edge-case of wrongly emitting SDK_READY if:
  // - `/memberships` fetch and SPLIT_KILL occurs before `/splitChanges` fetch, and
  // - storage has cached splits (for which case `splitsStorage.killLocally` can return true)
  splitsEventEmitter.on(SDK_SPLITS_ARRIVED, (isSplitKill: boolean) => { if (!isSplitKill) splitsEventEmitter.splitsArrived = true; });
  splitsEventEmitter.once(SDK_SPLITS_CACHE_LOADED, () => { splitsEventEmitter.splitsCacheLoaded = true; });

  return splitsEventEmitter;
}

function segmentsEventEmitterFactory(EventEmitter: new () => SplitIO.IEventEmitter): ISegmentsEventEmitter {
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
  EventEmitter: new () => SplitIO.IEventEmitter,
  settings: ISettings,
  splits: ISplitsEventEmitter = splitsEventEmitterFactory(EventEmitter),
  isShared?: boolean
): IReadinessManager {

  const readyTimeout = settings.startup.readyTimeout;

  const segments: ISegmentsEventEmitter = segmentsEventEmitterFactory(EventEmitter);
  const gate: IReadinessEventEmitter = new EventEmitter();

  let lastUpdate = 0;
  function syncLastUpdate() {
    const dateNow = Date.now();
    // ensure lastUpdate is always increasing per event, is case Date.now() is mocked or its value is the same
    lastUpdate = dateNow > lastUpdate ? dateNow : lastUpdate + 1;
  }

  // emit SDK_READY_FROM_CACHE
  let isReadyFromCache = false;
  if (splits.splitsCacheLoaded) isReadyFromCache = true; // ready from cache, but doesn't emit SDK_READY_FROM_CACHE
  else splits.once(SDK_SPLITS_CACHE_LOADED, checkIsReadyFromCache);

  // emit SDK_READY_TIMED_OUT
  let hasTimedout = false;

  function timeout() { // eslint-disable-next-line no-use-before-define
    if (hasTimedout || isReady) return;
    hasTimedout = true;
    syncLastUpdate();
    gate.emit(SDK_READY_TIMED_OUT, 'Split SDK emitted SDK_READY_TIMED_OUT event.');
  }


  // emit SDK_READY and SDK_UPDATE
  let isReady = false;
  splits.on(SDK_SPLITS_ARRIVED, checkIsReadyOrUpdate);
  segments.on(SDK_SEGMENTS_ARRIVED, checkIsReadyOrUpdate);

  let isDestroyed = false;
  let readyTimeoutId: ReturnType<typeof setTimeout>;
  function __init() {
    isDestroyed = false;
    if (readyTimeout > 0 && !isReady) readyTimeoutId = setTimeout(timeout, readyTimeout);
  }

  splits.initCallbacks.push(__init);
  if (splits.hasInit) __init();

  function checkIsReadyFromCache() {
    isReadyFromCache = true;
    // Don't emit SDK_READY_FROM_CACHE if SDK_READY has been emitted
    if (!isReady && !isDestroyed) {
      try {
        syncLastUpdate();
        gate.emit(SDK_READY_FROM_CACHE);
      } catch (e) {
        // throws user callback exceptions in next tick
        setTimeout(() => { throw e; }, 0);
      }
    }
  }

  function checkIsReadyOrUpdate(diff: any) {
    if (isDestroyed) return;
    if (isReady) {
      try {
        syncLastUpdate();
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
          syncLastUpdate();
          gate.emit(SDK_READY);
        } catch (e) {
          // throws user callback exceptions in next tick
          setTimeout(() => { throw e; }, 0);
        }
      }
    }
  }

  return {
    splits,
    segments,
    gate,

    shared() {
      return readinessManagerFactory(EventEmitter, settings, splits, true);
    },

    // @TODO review/remove next methods when non-recoverable errors are reworked
    // Called on consumer mode, when storage fails to connect
    timeout,
    // Called on 403 error (client-side SDK key on server-side), to set the SDK as destroyed for
    // tracking and evaluations, while keeping event listeners to emit SDK_READY_TIMED_OUT event
    setDestroyed() { isDestroyed = true; },

    init() {
      if (splits.hasInit) return;
      splits.hasInit = true;
      splits.initCallbacks.forEach(cb => cb());
    },

    destroy() {
      isDestroyed = true;
      syncLastUpdate();
      clearTimeout(readyTimeoutId);

      if (!isShared) splits.hasInit = false;
    },

    isReady() { return isReady; },
    isReadyFromCache() { return isReadyFromCache; },
    isTimedout() { return hasTimedout && !isReady; },
    hasTimedout() { return hasTimedout; },
    isDestroyed() { return isDestroyed; },
    isOperational() { return (isReady || isReadyFromCache) && !isDestroyed; },
    lastUpdate() { return lastUpdate; }
  };

}
