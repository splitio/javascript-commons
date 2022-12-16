import { SplitsCacheInMemory } from './SplitsCacheInMemory';
import { MySegmentsCacheInMemory } from './MySegmentsCacheInMemory';
import { ImpressionsCacheInMemory } from './ImpressionsCacheInMemory';
import { EventsCacheInMemory } from './EventsCacheInMemory';
import { IStorageSync, IStorageFactoryParams } from '../types';
import { ImpressionCountsCacheInMemory } from './ImpressionCountsCacheInMemory';
import { DEBUG, LOCALHOST_MODE, NONE, STORAGE_MEMORY } from '../../utils/constants';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from './TelemetryCacheInMemory';
import { UniqueKeysCacheInMemoryCS } from './UniqueKeysCacheInMemoryCS';

/**
 * InMemory storage factory for standalone client-side SplitFactory
 *
 * @param params parameters required by EventsCacheSync
 */
export function InMemoryStorageCSFactory(params: IStorageFactoryParams): IStorageSync {
  const { settings: { scheduler: { impressionsQueueSize, eventsQueueSize, }, sync: { impressionsMode } } } = params;

  const splits = new SplitsCacheInMemory();
  const segments = new MySegmentsCacheInMemory();

  const storage = {
    splits,
    segments,
    impressions: new ImpressionsCacheInMemory(impressionsQueueSize),
    impressionCounts: impressionsMode !== DEBUG ? new ImpressionCountsCacheInMemory() : undefined,
    events: new EventsCacheInMemory(eventsQueueSize),
    telemetry: shouldRecordTelemetry(params) ? new TelemetryCacheInMemory(splits, segments) : undefined,
    uniqueKeys: impressionsMode === NONE ? new UniqueKeysCacheInMemoryCS() : undefined,

    // When using MEMORY we should clean all the caches to leave them empty
    destroy() {
      this.splits.clear();
      this.segments.clear();
      this.impressions.clear();
      this.impressionCounts && this.impressionCounts.clear();
      this.events.clear();
      this.uniqueKeys && this.uniqueKeys.clear();
    },

    // When using shared instanciation with MEMORY we reuse everything but segments (they are unique per key)
    shared() {
      return {
        splits: this.splits,
        segments: new MySegmentsCacheInMemory(),
        impressions: this.impressions,
        impressionCounts: this.impressionCounts,
        events: this.events,
        telemetry: this.telemetry,

        // Set a new splits cache to clean it for the client without affecting other clients
        destroy() {
          this.splits = new SplitsCacheInMemory();
          this.segments.clear();
        }
      };
    },
  };

  // @TODO revisit storage logic in localhost mode
  // No tracking data in localhost mode to avoid memory leaks
  if (params.settings.mode === LOCALHOST_MODE) {
    const noopTrack = () => true;
    storage.impressions.track = noopTrack;
    storage.events.track = noopTrack;
    if (storage.impressionCounts) storage.impressionCounts.track = noopTrack;
    if (storage.uniqueKeys) storage.uniqueKeys.track = noopTrack;
  }

  return storage;
}

InMemoryStorageCSFactory.type = STORAGE_MEMORY;
