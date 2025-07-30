import { ImpressionsCacheInMemory } from '../inMemory/ImpressionsCacheInMemory';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { EventsCacheInMemory } from '../inMemory/EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync, IStorageSyncFactory } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderCS, myLargeSegmentsKeyBuilder } from '../KeyBuilderCS';
import { isLocalStorageAvailable } from '../../utils/env/isLocalStorageAvailable';
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

function validateStorage(log: ILogger) {
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

    const storage = validateStorage(log);
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
        return Promise.resolve();
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
