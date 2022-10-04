import { ImpressionsCacheInMemory } from '../inMemory/ImpressionsCacheInMemory';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { EventsCacheInMemory } from '../inMemory/EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync, IStorageSyncFactory } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { isLocalStorageAvailable } from '../../utils/env/isLocalStorageAvailable';
import { SplitsCacheInLocal } from './SplitsCacheInLocal';
import { MySegmentsCacheInLocal } from './MySegmentsCacheInLocal';
import { MySegmentsCacheInMemory } from '../inMemory/MySegmentsCacheInMemory';
import { SplitsCacheInMemory } from '../inMemory/SplitsCacheInMemory';
import { DEFAULT_CACHE_EXPIRATION_IN_MILLIS } from '../../utils/constants/browser';
import { InMemoryStorageCSFactory } from '../inMemory/InMemoryStorageCS';
import { LOG_PREFIX } from './constants';
import { DEBUG, NONE, STORAGE_LOCALSTORAGE } from '../../utils/constants';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from '../inMemory/TelemetryCacheInMemory';
import { UniqueKeysCacheInMemoryCS } from '../inMemory/UniqueKeysCacheInMemoryCS';
import { getMatching } from '../../utils/key';

export interface InLocalStorageOptions {
  prefix?: string
}

/**
 * InLocal storage factory for standalone client-side SplitFactory
 */
export function InLocalStorage(options: InLocalStorageOptions = {}): IStorageSyncFactory {

  const prefix = validatePrefix(options.prefix);

  function InLocalStorageCSFactory(params: IStorageFactoryParams): IStorageSync {

    // Fallback to InMemoryStorage if LocalStorage API is not available
    if (!isLocalStorageAvailable()) {
      params.settings.log.warn(LOG_PREFIX + 'LocalStorage API is unavailable. Falling back to default MEMORY storage');
      return InMemoryStorageCSFactory(params);
    }

    const { settings, settings: { log, scheduler: { impressionsQueueSize, eventsQueueSize, }, sync: { impressionsMode, __splitFiltersValidation } } } = params;
    const matchingKey = getMatching(settings.core.key);
    const keys = new KeyBuilderCS(prefix, matchingKey as string);
    const expirationTimestamp = Date.now() - DEFAULT_CACHE_EXPIRATION_IN_MILLIS;

    const splits = new SplitsCacheInLocal(log, keys, expirationTimestamp, __splitFiltersValidation);
    const segments = new MySegmentsCacheInLocal(log, keys);

    return {
      splits,
      segments,
      impressions: new ImpressionsCacheInMemory(impressionsQueueSize),
      impressionCounts: impressionsMode !== DEBUG ? new ImpressionCountsCacheInMemory() : undefined,
      events: new EventsCacheInMemory(eventsQueueSize),
      telemetry: shouldRecordTelemetry(params) ? new TelemetryCacheInMemory(splits, segments) : undefined,
      uniqueKeys: impressionsMode === NONE ? new UniqueKeysCacheInMemoryCS() : undefined,

      destroy() {
        this.splits = new SplitsCacheInMemory();
        this.segments = new MySegmentsCacheInMemory();
        this.impressions.clear();
        this.impressionCounts && this.impressionCounts.clear();
        this.events.clear();
        this.uniqueKeys?.clear();
      },

      // When using shared instanciation with MEMORY we reuse everything but segments (they are customer per key).
      shared(matchingKey: string) {
        const childKeysBuilder = new KeyBuilderCS(prefix, matchingKey);

        return {
          splits: this.splits,
          segments: new MySegmentsCacheInLocal(log, childKeysBuilder),
          impressions: this.impressions,
          impressionCounts: this.impressionCounts,
          events: this.events,
          telemetry: this.telemetry,

          destroy() {
            this.splits = new SplitsCacheInMemory();
            this.segments = new MySegmentsCacheInMemory();
          }
        };
      },
    };
  }

  InLocalStorageCSFactory.type = STORAGE_LOCALSTORAGE;
  return InLocalStorageCSFactory;
}
