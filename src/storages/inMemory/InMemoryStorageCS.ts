import SplitsCacheInMemory from './SplitsCacheInMemory';
import MySegmentsCacheInMemory from './MySegmentsCacheInMemory';
import ImpressionsCacheInMemory from './ImpressionsCacheInMemory';
import EventsCacheInMemory from './EventsCacheInMemory';
import { IStorageSyncCS, IStorageFactoryParams } from '../types';
import ImpressionCountsCacheInMemory from './ImpressionCountsCacheInMemory';

/**
 * InMemory storage factory for standalone client-side SplitFactory
 *
 * @param params parameters required by EventsCacheSync
 */
export function InMemoryStorageCSFactory(params: IStorageFactoryParams): IStorageSyncCS {

  return {
    splits: new SplitsCacheInMemory(),
    segments: new MySegmentsCacheInMemory(),
    impressions: new ImpressionsCacheInMemory(),
    impressionCounts: params.optimize ? new ImpressionCountsCacheInMemory() : undefined,
    events: new EventsCacheInMemory(params.eventsQueueSize),

    // When using MEMORY we should clean all the caches to leave them empty
    destroy() {
      this.splits.clear();
      this.segments.clear();
      this.impressions.clear();
      this.impressionCounts && this.impressionCounts.clear();
      this.events.clear();
    },

    // When using shared instanciation with MEMORY we reuse everything but segments (they are unique per key)
    shared() {
      return {
        splits: this.splits,
        segments: new MySegmentsCacheInMemory(),
        impressions: this.impressions,
        impressionCounts: this.impressionCounts,
        events: this.events,

        // Set a new splits cache to clean it for the client without affecting other clients
        destroy() {
          this.splits = new SplitsCacheInMemory();
          this.segments.clear();
        }
      };
    },
  };
}
