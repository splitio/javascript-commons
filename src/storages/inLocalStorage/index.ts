import { ImpressionsCacheInMemory } from '../inMemory/ImpressionsCacheInMemory';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { EventsCacheInMemory } from '../inMemory/EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync, IStorageSyncFactory } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderCS, myLargeSegmentsKeyBuilder } from '../KeyBuilderCS';
import { isLocalStorageAvailable, isStorageValid } from '../../utils/env/isLocalStorageAvailable';
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

export interface StorageAdapter {
  // Methods to support async storages
  load?: () => Promise<void>;
  save?: () => Promise<void>;
  // Methods based on https://developer.mozilla.org/en-US/docs/Web/API/Storage
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

function isTillKey(key: string) {
  return key.endsWith('.till');
}

function storageAdapter(log: ILogger, prefix: string, storage: SplitIO.Storage): StorageAdapter {
  let cache: Record<string, string> = {};

  let connectPromise: Promise<void> | undefined;
  let disconnectPromise = Promise.resolve();

  return {
    load() {
      return connectPromise || (connectPromise = storage.getItem(prefix).then((storedCache) => {
        cache = JSON.parse(storedCache || '{}');
      }).catch((e) => {
        log.error(LOG_PREFIX + 'Rejected promise calling storage getItem, with error: ' + e);
      }));
    },
    save() {
      return disconnectPromise = disconnectPromise.then(() => {
        return storage.setItem(prefix, JSON.stringify(cache)).catch((e) => {
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

function validateStorage(log: ILogger, prefix: string, storage?: SplitIO.Storage): StorageAdapter | undefined {
  if (storage) {
    if (isStorageValid(storage)) return storageAdapter(log, prefix, storage);
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

    const storage = validateStorage(log, prefix, options.storage);
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
