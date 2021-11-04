import SplitsCacheInMemory from './SplitsCacheInMemory';
import MySegmentsCacheInMemory from './MySegmentsCacheInMemory';
import ImpressionsCacheInMemory from './ImpressionsCacheInMemory';
import EventsCacheInMemory from './EventsCacheInMemory';
import { IStorageSync, IStorageFactoryParams } from '../types';
import ImpressionCountsCacheInMemory from './ImpressionCountsCacheInMemory';
import { STORAGE_MEMORY } from '../../utils/constants';
import { SplitIO } from '../../types';

/**
 * InMemory storage factory for standalone client-side SplitFactory
 *
 * @param params parameters required by EventsCacheSync
 */
export function InMemoryStorageCSFactory(params: IStorageFactoryParams): IStorageSync {

  return {
    splits: new SplitsCacheInMemory(),
    segments: new MySegmentsCacheInMemory(),
    impressions: new ImpressionsCacheInMemory(),
    impressionCounts: params.optimize ? new ImpressionCountsCacheInMemory() : undefined,
    events: new EventsCacheInMemory(params.settings.scheduler.eventsQueueSize),

    // When using MEMORY we should clean all the caches to leave them empty
    destroy() {
      this.splits.clear();
      this.segments.clear();
      this.impressions.clear();
      this.impressionCounts && this.impressionCounts.clear();
      this.events.clear();
    },

    // @ts-ignore, private method, for POC
    getSnapshot(): SplitIO.PreloadedData {
      return {
        lastUpdated: Date.now(), // @ts-ignore accessing private prop
        since: this.splits.changeNumber, // @ts-ignore accessing private prop
        splitsData: this.splits.splitsCache,
        mySegmentsData: { // @ts-ignore accessing private prop
          [params.matchingKey as string]: Object.keys(this.segments.segmentCache)
        }
      };
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

InMemoryStorageCSFactory.type = STORAGE_MEMORY;
