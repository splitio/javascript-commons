import { objectAssign } from '../utils/lang/objectAssign';
import { ISettings } from '../types';
import SplitIO, { SdkReadyMetadata } from '../../types/splitio';
import { SDK_DEFINITIONS_ARRIVED, SDK_DEFINITIONS_CACHE_LOADED, SDK_SEGMENTS_ARRIVED, SDK_READY_TIMED_OUT, SDK_READY_FROM_CACHE, SDK_UPDATE, SDK_READY } from './constants';
import { IReadinessEventEmitter, IReadinessManager, ISegmentsEventEmitter, IDefinitionsEventEmitter } from './types';

function definitionsEventEmitterFactory(EventEmitter: new () => SplitIO.IEventEmitter): IDefinitionsEventEmitter {
  const definitionsEventEmitter = objectAssign(new EventEmitter(), {
    definitionsArrived: false,
    definitionsCacheLoaded: false,
    hasInit: false,
    initCallbacks: []
  });

  // `isSplitKill` condition avoids an edge-case of wrongly emitting SDK_READY if:
  // - `/memberships` fetch and SPLIT_KILL occurs before `/splitChanges` fetch, and
  // - storage has cached splits (for which case `splitsStorage.killLocally` can return true)
  definitionsEventEmitter.on(SDK_DEFINITIONS_ARRIVED, (metadata: SplitIO.SdkUpdateMetadata, isSplitKill: boolean) => { if (!isSplitKill) definitionsEventEmitter.definitionsArrived = true; });
  definitionsEventEmitter.once(SDK_DEFINITIONS_CACHE_LOADED, () => { definitionsEventEmitter.definitionsCacheLoaded = true; });

  return definitionsEventEmitter;
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
  definitions: IDefinitionsEventEmitter = definitionsEventEmitterFactory(EventEmitter),
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

  let metadataReady: SdkReadyMetadata = {
    initialCacheLoad: true
  };

  // emit SDK_READY_FROM_CACHE
  let isReadyFromCache = false;
  if (definitions.definitionsCacheLoaded) isReadyFromCache = true; // ready from cache, but doesn't emit SDK_READY_FROM_CACHE
  else definitions.once(SDK_DEFINITIONS_CACHE_LOADED, checkIsReadyFromCache);

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
  definitions.on(SDK_DEFINITIONS_ARRIVED, checkIsReadyOrUpdate);
  segments.on(SDK_SEGMENTS_ARRIVED, checkIsReadyOrUpdate);

  let isDestroyed = false;
  let readyTimeoutId: ReturnType<typeof setTimeout>;
  function __init() {
    isDestroyed = false;
    if (readyTimeout > 0 && !isReady) readyTimeoutId = setTimeout(timeout, readyTimeout);
  }

  definitions.initCallbacks.push(__init);
  if (definitions.hasInit) __init();

  function checkIsReadyFromCache(cacheMetadata: SdkReadyMetadata) {
    metadataReady = cacheMetadata;
    isReadyFromCache = true;
    // Don't emit SDK_READY_FROM_CACHE if SDK_READY has been emitted
    if (!isReady && !isDestroyed) {
      try {
        syncLastUpdate();
        gate.emit(SDK_READY_FROM_CACHE, cacheMetadata);
      } catch (e) {
        // throws user callback exceptions in next tick
        setTimeout(() => { throw e; }, 0);
      }
    }
  }

  function checkIsReadyOrUpdate(metadata: SplitIO.SdkUpdateMetadata) {
    if (isDestroyed) return;
    if (isReady) {
      try {
        syncLastUpdate();
        gate.emit(SDK_UPDATE, metadata);
      } catch (e) {
        // throws user callback exceptions in next tick
        setTimeout(() => { throw e; }, 0);
      }
    } else {
      if (definitions.definitionsArrived && segments.segmentsArrived) {
        clearTimeout(readyTimeoutId);
        isReady = true;
        try {
          syncLastUpdate();
          if (!isReadyFromCache) {
            isReadyFromCache = true;
            const metadataReadyFromCache: SplitIO.SdkReadyMetadata = {
              initialCacheLoad: true, // Fresh install, no cache existed
              lastUpdateTimestamp: undefined // No cache timestamp when fresh install
            };
            gate.emit(SDK_READY_FROM_CACHE, metadataReadyFromCache);
          }
          gate.emit(SDK_READY, metadataReady);
        } catch (e) {
          // throws user callback exceptions in next tick
          setTimeout(() => { throw e; }, 0);
        }
      }
    }
  }

  return {
    definitions,
    segments,
    gate,

    shared() {
      return readinessManagerFactory(EventEmitter, settings, definitions, true);
    },

    // @TODO review/remove next methods when non-recoverable errors are reworked
    // Called on consumer mode, when storage fails to connect
    timeout,
    // Called on 403 error (client-side SDK key on server-side), to set the SDK as destroyed for
    // tracking and evaluations, while keeping event listeners to emit SDK_READY_TIMED_OUT event
    setDestroyed() { isDestroyed = true; },

    init() {
      if (definitions.hasInit) return;
      definitions.hasInit = true;
      definitions.initCallbacks.forEach(cb => cb());
    },

    destroy() {
      isDestroyed = true;
      syncLastUpdate();
      clearTimeout(readyTimeoutId);

      if (!isShared) definitions.hasInit = false;
    },

    isReady() { return isReady; },
    isReadyFromCache() { return isReadyFromCache; },
    isTimedout() { return hasTimedout && !isReady; },
    hasTimedout() { return hasTimedout; },
    isDestroyed() { return isDestroyed; },
    isOperational() { return (isReady || isReadyFromCache) && !isDestroyed; },
    lastUpdate() { return lastUpdate; },
    metadataReady() { return metadataReady; }
  };

}
