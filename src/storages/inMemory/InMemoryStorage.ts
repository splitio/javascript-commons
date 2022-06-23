import { SplitsCacheInMemory } from './SplitsCacheInMemory';
import { SegmentsCacheInMemory } from './SegmentsCacheInMemory';
import { ImpressionsCacheInMemory } from './ImpressionsCacheInMemory';
import { EventsCacheInMemory } from './EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync } from '../types';
import { ImpressionCountsCacheInMemory } from './ImpressionCountsCacheInMemory';
import { LOCALHOST_MODE, STORAGE_MEMORY } from '../../utils/constants';
import { TelemetryCacheInMemory } from './TelemetryCacheInMemory';
import { SplitIO } from '../../types';
import { setToArray, ISet } from '../../utils/lang/sets';

/**
 * InMemory storage factory for standalone server-side SplitFactory
 *
 * @param params parameters required by EventsCacheSync
 */
export function InMemoryStorageFactory(params: IStorageFactoryParams): IStorageSync {

  return {
    splits: new SplitsCacheInMemory(),
    segments: new SegmentsCacheInMemory(),
    impressions: new ImpressionsCacheInMemory(params.impressionsQueueSize),
    impressionCounts: params.optimize ? new ImpressionCountsCacheInMemory() : undefined,
    events: new EventsCacheInMemory(params.eventsQueueSize),
    telemetry: params.mode !== LOCALHOST_MODE ? new TelemetryCacheInMemory() : undefined, // Always track telemetry in standalone mode on server-side

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
        splitsData: this.splits.splitsCache, // @ts-ignore accessing private prop
        segmentsData: Object.keys(this.segments.segmentCache).reduce((prev, cur) => { // @ts-ignore accessing private prop
          prev[cur] = setToArray(this.segments.segmentCache[cur] as ISet<string>);
          return prev;
        }, {})
      };
    },
  };
}

InMemoryStorageFactory.type = STORAGE_MEMORY;
