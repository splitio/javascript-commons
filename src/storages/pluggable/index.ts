import { IPluggableStorageWrapper, IStorageAsync, IStorageAsyncFactory, IStorageFactoryParams, ITelemetryCacheAsync } from '../types';

import { KeyBuilderSS } from '../KeyBuilderSS';
import { SplitsCachePluggable } from './SplitsCachePluggable';
import { SegmentsCachePluggable } from './SegmentsCachePluggable';
import { ImpressionsCachePluggable } from './ImpressionsCachePluggable';
import { EventsCachePluggable } from './EventsCachePluggable';
import { wrapperAdapter, METHODS_TO_PROMISE_WRAP } from './wrapperAdapter';
import { isObject } from '../../utils/lang';
import { getStorageHash, validatePrefix } from '../KeyBuilder';
import { CONSUMER_PARTIAL_MODE, STORAGE_PLUGGABLE } from '../../utils/constants';
import { ImpressionsCacheInMemory } from '../inMemory/ImpressionsCacheInMemory';
import { EventsCacheInMemory } from '../inMemory/EventsCacheInMemory';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from '../inMemory/TelemetryCacheInMemory';
import { TelemetryCachePluggable } from './TelemetryCachePluggable';
import { ImpressionCountsCachePluggable } from './ImpressionCountsCachePluggable';
import { UniqueKeysCachePluggable } from './UniqueKeysCachePluggable';
import { UniqueKeysCacheInMemory } from '../inMemory/UniqueKeysCacheInMemory';
import { UniqueKeysCacheInMemoryCS } from '../inMemory/UniqueKeysCacheInMemoryCS';
import { metadataBuilder } from '../utils';
import { LOG_PREFIX } from '../pluggable/constants';
import { RBSegmentsCachePluggable } from './RBSegmentsCachePluggable';

const NO_VALID_WRAPPER = 'Expecting pluggable storage `wrapper` in options, but no valid wrapper instance was provided.';
const NO_VALID_WRAPPER_INTERFACE = 'The provided wrapper instance doesn’t follow the expected interface. Check our docs.';

export interface PluggableStorageOptions {
  prefix?: string
  wrapper: IPluggableStorageWrapper
}

/**
 * Validate pluggable storage factory options.
 *
 * @param options - user options
 * @throws Will throw an error if the options are invalid. Example: wrapper is not provided or doesn't have some methods.
 */
function validatePluggableStorageOptions(options: any) {
  if (!isObject(options) || !isObject(options.wrapper)) throw new Error(NO_VALID_WRAPPER);

  const wrapper = options.wrapper;
  const missingMethods = METHODS_TO_PROMISE_WRAP.filter(method => typeof wrapper[method] !== 'function');
  if (missingMethods.length) throw new Error(`${NO_VALID_WRAPPER_INTERFACE} The following methods are missing or invalid: ${missingMethods}`);
}

// Async return type in `client.track` method on consumer partial mode
// No need to promisify impressions cache
function promisifyEventsTrack(events: any) {
  const origTrack = events.track;
  events.track = function () {
    return Promise.resolve(origTrack.apply(this, arguments));
  };
  return events;
}

/**
 * Pluggable storage factory for consumer server-side & client-side SplitFactory.
 */
export function PluggableStorage(options: PluggableStorageOptions): IStorageAsyncFactory {

  validatePluggableStorageOptions(options);

  const prefix = validatePrefix(options.prefix);

  function PluggableStorageFactory(params: IStorageFactoryParams): IStorageAsync {
    const { onReadyCb, settings, settings: { log, mode, scheduler: { impressionsQueueSize, eventsQueueSize } } } = params;
    const metadata = metadataBuilder(settings);
    const keys = new KeyBuilderSS(prefix, metadata);
    const wrapper = wrapperAdapter(log, options.wrapper);

    const isSynchronizer = mode === undefined; // If mode is not defined, the synchronizer is running
    const isPartialConsumer = mode === CONSUMER_PARTIAL_MODE;

    const telemetry = shouldRecordTelemetry(params) || isSynchronizer ?
      isPartialConsumer ?
        new TelemetryCacheInMemory() :
        new TelemetryCachePluggable(log, keys, wrapper) :
      undefined;

    const impressionCountsCache = isPartialConsumer ?
      new ImpressionCountsCacheInMemory() :
      new ImpressionCountsCachePluggable(log, keys.buildImpressionsCountKey(), wrapper);

    const uniqueKeysCache = isPartialConsumer ?
      settings.core.key === undefined ? new UniqueKeysCacheInMemory() : new UniqueKeysCacheInMemoryCS() :
      new UniqueKeysCachePluggable(log, keys.buildUniqueKeysKey(), wrapper);

    // Connects to wrapper and emits SDK_READY event on main client
    const connectPromise = wrapper.connect().then(() => {
      if (isSynchronizer) {
        // @TODO reuse InLocalStorage::validateCache logic
        // In standalone or producer mode, clear storage if SDK key, flags filter criteria or flags spec version was modified
        return wrapper.get(keys.buildHashKey()).then((hash) => {
          const currentHash = getStorageHash(settings);
          if (hash !== currentHash) {
            log.info(LOG_PREFIX + 'Storage HASH has changed (SDK key, flags filter criteria or flags spec version was modified). Clearing cache');
            return wrapper.getKeysByPrefix(`${keys.prefix}.`).then(storageKeys => {
              return Promise.all(storageKeys.map(storageKey => wrapper.del(storageKey)));
            }).then(() => wrapper.set(keys.buildHashKey(), currentHash));
          }
        }).then(() => {
          onReadyCb();
        });
      } else {
        // Start periodic flush of async storages if not running synchronizer (producer mode)
        if ((impressionCountsCache as ImpressionCountsCachePluggable).start) (impressionCountsCache as ImpressionCountsCachePluggable).start();
        if ((uniqueKeysCache as UniqueKeysCachePluggable).start) (uniqueKeysCache as UniqueKeysCachePluggable).start();
        if (telemetry && (telemetry as ITelemetryCacheAsync).recordConfig) (telemetry as ITelemetryCacheAsync).recordConfig();

        onReadyCb();
      }
    }).catch((e) => {
      e = e || new Error('Error connecting wrapper');
      onReadyCb(e);
      return e; // Propagate error for shared clients
    });

    return {
      splits: new SplitsCachePluggable(log, keys, wrapper, settings.sync.__splitFiltersValidation),
      rbSegments: new RBSegmentsCachePluggable(log, keys, wrapper),
      segments: new SegmentsCachePluggable(log, keys, wrapper),
      impressions: isPartialConsumer ? new ImpressionsCacheInMemory(impressionsQueueSize) : new ImpressionsCachePluggable(log, keys.buildImpressionsKey(), wrapper, metadata),
      impressionCounts: impressionCountsCache,
      events: isPartialConsumer ? promisifyEventsTrack(new EventsCacheInMemory(eventsQueueSize)) : new EventsCachePluggable(log, keys.buildEventsKey(), wrapper, metadata),
      telemetry,
      uniqueKeys: uniqueKeysCache,

      // Stop periodic flush and disconnect the underlying storage
      destroy() {
        return Promise.all(isSynchronizer ? [] : [
          (impressionCountsCache as ImpressionCountsCachePluggable).stop && (impressionCountsCache as ImpressionCountsCachePluggable).stop(),
          (uniqueKeysCache as UniqueKeysCachePluggable).stop && (uniqueKeysCache as UniqueKeysCachePluggable).stop(),
        ]).then(() => wrapper.disconnect());
      },

      // emits SDK_READY event on shared clients and returns a reference to the storage
      shared(_, onReadyCb) {
        connectPromise.then(onReadyCb);

        return {
          ...this,
          // no-op destroy, to disconnect the wrapper only when the main client is destroyed
          destroy() { }
        };
      }
    };
  }

  PluggableStorageFactory.type = STORAGE_PLUGGABLE;
  return PluggableStorageFactory;
}
