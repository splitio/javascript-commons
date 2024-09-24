import { SplitsCacheInMemory } from './SplitsCacheInMemory';
import { SegmentsCacheInMemory } from './SegmentsCacheInMemory';
import { ImpressionsCacheInMemory } from './ImpressionsCacheInMemory';
import { EventsCacheInMemory } from './EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync } from '../types';
import { ImpressionCountsCacheInMemory } from './ImpressionCountsCacheInMemory';
import { DEBUG, LOCALHOST_MODE, NONE, STORAGE_MEMORY } from '../../utils/constants';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from './TelemetryCacheInMemory';
import { UniqueKeysCacheInMemory } from './UniqueKeysCacheInMemory';
import { setToArray, ISet } from '../../utils/lang/sets';
import { SplitIO } from '../../types';

/**
 * InMemory storage factory for standalone server-side SplitFactory
 *
 * @param params parameters required by EventsCacheSync
 */
export function InMemoryStorageFactory(params: IStorageFactoryParams): IStorageSync {
  const { settings: { scheduler: { impressionsQueueSize, eventsQueueSize, }, sync: { impressionsMode, __splitFiltersValidation } } } = params;

  const splits = new SplitsCacheInMemory(__splitFiltersValidation);
  const segments = new SegmentsCacheInMemory();

  const storage = {
    splits,
    segments,
    impressions: new ImpressionsCacheInMemory(impressionsQueueSize),
    impressionCounts: impressionsMode !== DEBUG ? new ImpressionCountsCacheInMemory() : undefined,
    events: new EventsCacheInMemory(eventsQueueSize),
    telemetry: shouldRecordTelemetry(params) ? new TelemetryCacheInMemory(splits, segments) : undefined,
    uniqueKeys: impressionsMode === NONE ? new UniqueKeysCacheInMemory() : undefined,

    // When using MEMORY we should clean all the caches to leave them empty
    destroy() {
      this.splits.clear();
      this.segments.clear();
      this.impressions.clear();
      this.impressionCounts && this.impressionCounts.clear();
      this.events.clear();
      this.uniqueKeys && this.uniqueKeys.clear();
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

InMemoryStorageFactory.type = STORAGE_MEMORY;
