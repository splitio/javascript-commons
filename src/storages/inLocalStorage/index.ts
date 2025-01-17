import { ImpressionsCacheInMemory } from '../inMemory/ImpressionsCacheInMemory';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { EventsCacheInMemory } from '../inMemory/EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync, IStorageSyncFactory } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderCS, myLargeSegmentsKeyBuilder } from '../KeyBuilderCS';
import { isLocalStorageAvailable } from '../../utils/env/isLocalStorageAvailable';
import { SplitsCacheInLocal } from './SplitsCacheInLocal';
import { MySegmentsCacheInLocal } from './MySegmentsCacheInLocal';
import { InMemoryStorageCSFactory } from '../inMemory/InMemoryStorageCS';
import { LOG_PREFIX } from './constants';
import { STORAGE_LOCALSTORAGE } from '../../utils/constants';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from '../inMemory/TelemetryCacheInMemory';
import { UniqueKeysCacheInMemoryCS } from '../inMemory/UniqueKeysCacheInMemoryCS';
import { getMatching } from '../../utils/key';
import { validateCache } from './validateCache';
import SplitIO from '../../../types/splitio';

/**
 * InLocal storage factory for standalone client-side SplitFactory
 */
export function InLocalStorage(options: SplitIO.InLocalStorageOptions = {}): IStorageSyncFactory {

  const prefix = validatePrefix(options.prefix);

  function InLocalStorageCSFactory(params: IStorageFactoryParams): IStorageSync {

    // Fallback to InMemoryStorage if LocalStorage API is not available
    if (!isLocalStorageAvailable()) {
      params.settings.log.warn(LOG_PREFIX + 'LocalStorage API is unavailable. Falling back to default MEMORY storage');
      return InMemoryStorageCSFactory(params);
    }

    const { settings, settings: { log, scheduler: { impressionsQueueSize, eventsQueueSize } } } = params;
    const matchingKey = getMatching(settings.core.key);
    const keys = new KeyBuilderCS(prefix, matchingKey);

    const splits = new SplitsCacheInLocal(settings, keys);
    const segments = new MySegmentsCacheInLocal(log, keys);
    const largeSegments = new MySegmentsCacheInLocal(log, myLargeSegmentsKeyBuilder(prefix, matchingKey));

    return {
      splits,
      segments,
      largeSegments,
      impressions: new ImpressionsCacheInMemory(impressionsQueueSize),
      impressionCounts: new ImpressionCountsCacheInMemory(),
      events: new EventsCacheInMemory(eventsQueueSize),
      telemetry: shouldRecordTelemetry(params) ? new TelemetryCacheInMemory(splits, segments) : undefined,
      uniqueKeys: new UniqueKeysCacheInMemoryCS(),

      validateCache() {
        return validateCache(options, settings, keys, splits, segments, largeSegments);
      },

      destroy() { },

      // When using shared instantiation with MEMORY we reuse everything but segments (they are customer per key).
      shared(matchingKey: string) {

        return {
          splits: this.splits,
          segments: new MySegmentsCacheInLocal(log, new KeyBuilderCS(prefix, matchingKey)),
          largeSegments: new MySegmentsCacheInLocal(log, myLargeSegmentsKeyBuilder(prefix, matchingKey)),
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
