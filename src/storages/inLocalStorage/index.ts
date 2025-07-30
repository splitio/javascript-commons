import { ImpressionsCacheInMemory } from '../inMemory/ImpressionsCacheInMemory';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { EventsCacheInMemory } from '../inMemory/EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync, IStorageSyncFactory, StorageAdapter } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderCS, myLargeSegmentsKeyBuilder } from '../KeyBuilderCS';
import { isLocalStorageAvailable, isValidStorageWrapper, isWebStorage } from '../../utils/env/isLocalStorageAvailable';
import { SplitsCacheInLocal } from './SplitsCacheInLocal';
import { RBSegmentsCacheInLocal } from './RBSegmentsCacheInLocal';
import { MySegmentsCacheInLocal } from './MySegmentsCacheInLocal';
import { InMemoryStorageCSFactory } from '../inMemory/InMemoryStorageCS';
import { LOG_PREFIX } from './constants';
import { STORAGE_LOCALSTORAGE } from '../../utils/constants';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from '../inMemory/TelemetryCacheInMemory';
import { UniqueKeysCacheInMemoryCS } from '../inMemory/UniqueKeysCacheInMemoryCS';
import { getMatching } from '../../utils/key';
import { validateCache } from './validateCache';
import { ILogger } from '../../logger/types';
import SplitIO from '../../../types/splitio';

function isTillKey(key: string) {
  return key.endsWith('.till');
}

export function storageAdapter(log: ILogger, prefix: string, wrapper: SplitIO.StorageWrapper): StorageAdapter {
  let cache: Record<string, string> = {};

  let connectPromise: Promise<void> | undefined;
  let disconnectPromise = Promise.resolve();

  return {
    load() {
      return connectPromise || (connectPromise = Promise.resolve(wrapper.getItem(prefix)).then((storedCache) => {
        cache = JSON.parse(storedCache || '{}');
      }).catch((e) => {
        log.error(LOG_PREFIX + 'Rejected promise calling storage getItem, with error: ' + e);
      }));
    },
    save() {
      return disconnectPromise = disconnectPromise.then(() => {
        return Promise.resolve(wrapper.setItem(prefix, JSON.stringify(cache))).catch((e) => {
          log.error(LOG_PREFIX + 'Rejected promise calling storage setItem, with error: ' + e);
        });
      });
    },

    get length() {
      return Object.keys(cache).length;
    },
    getItem(key: string) {
      return cache[key] || null;
    },
    key(index: number) {
      return Object.keys(cache)[index] || null;
    },
    removeItem(key: string) {
      delete cache[key];
      if (isTillKey(key)) this.save!();
    },
    setItem(key: string, value: string) {
      cache[key] = value;
      if (isTillKey(key)) this.save!();
    }
  };
}

function validateStorage(log: ILogger, prefix: string, wrapper?: SplitIO.StorageWrapper): StorageAdapter | undefined {
  if (wrapper) {
    if (isValidStorageWrapper(wrapper)) {
      return isWebStorage(wrapper) ?
        wrapper as StorageAdapter: // localStorage and sessionStorage don't need adapter
        storageAdapter(log, prefix, wrapper);
    }
    log.warn(LOG_PREFIX + 'Invalid storage provided. Falling back to LocalStorage API');
  }

  if (isLocalStorageAvailable()) return localStorage;

  log.warn(LOG_PREFIX + 'LocalStorage API is unavailable. Falling back to default MEMORY storage');
}

/**
 * InLocal storage factory for standalone client-side SplitFactory
 */
export function InLocalStorage(options: SplitIO.InLocalStorageOptions = {}): IStorageSyncFactory {

  const prefix = validatePrefix(options.prefix);

  function InLocalStorageCSFactory(params: IStorageFactoryParams): IStorageSync {
    const { settings, settings: { log, scheduler: { impressionsQueueSize, eventsQueueSize } } } = params;

    const storage = validateStorage(log, prefix, options.wrapper);
    if (!storage) return InMemoryStorageCSFactory(params);

    const matchingKey = getMatching(settings.core.key);
    const keys = new KeyBuilderCS(prefix, matchingKey);

    const splits = new SplitsCacheInLocal(settings, keys, storage);
    const rbSegments = new RBSegmentsCacheInLocal(settings, keys, storage);
    const segments = new MySegmentsCacheInLocal(log, keys, storage);
    const largeSegments = new MySegmentsCacheInLocal(log, myLargeSegmentsKeyBuilder(prefix, matchingKey), storage);
    let validateCachePromise: Promise<boolean> | undefined;

    return {
      splits,
      rbSegments,
      segments,
      largeSegments,
      impressions: new ImpressionsCacheInMemory(impressionsQueueSize),
      impressionCounts: new ImpressionCountsCacheInMemory(),
      events: new EventsCacheInMemory(eventsQueueSize),
      telemetry: shouldRecordTelemetry(params) ? new TelemetryCacheInMemory(splits, segments) : undefined,
      uniqueKeys: new UniqueKeysCacheInMemoryCS(),

      validateCache() {
        return validateCachePromise || (validateCachePromise = validateCache(options, storage, settings, keys, splits, rbSegments, segments, largeSegments));
      },

      destroy() {
        return storage.save && storage.save();
      },

      // When using shared instantiation with MEMORY we reuse everything but segments (they are customer per key).
      shared(matchingKey: string) {

        return {
          splits: this.splits,
          rbSegments: this.rbSegments,
          segments: new MySegmentsCacheInLocal(log, new KeyBuilderCS(prefix, matchingKey), storage),
          largeSegments: new MySegmentsCacheInLocal(log, myLargeSegmentsKeyBuilder(prefix, matchingKey), storage),
          impressions: this.impressions,
          impressionCounts: this.impressionCounts,
          events: this.events,
          telemetry: this.telemetry,
          uniqueKeys: this.uniqueKeys,

          destroy() { }
        };
      },
    };
  }

  InLocalStorageCSFactory.type = STORAGE_LOCALSTORAGE;
  return InLocalStorageCSFactory;
}
