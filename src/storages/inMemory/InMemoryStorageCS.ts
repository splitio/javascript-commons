import { SplitsCacheInMemory } from './SplitsCacheInMemory';
import { MySegmentsCacheInMemory } from './MySegmentsCacheInMemory';
import { ImpressionsCacheInMemory } from './ImpressionsCacheInMemory';
import { EventsCacheInMemory } from './EventsCacheInMemory';
import { IStorageSync, IStorageFactoryParams } from '../types';
import { ImpressionCountsCacheInMemory } from './ImpressionCountsCacheInMemory';
import { LOCALHOST_MODE, STORAGE_MEMORY } from '../../utils/constants';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from './TelemetryCacheInMemory';
import { UniqueKeysCacheInMemoryCS } from './UniqueKeysCacheInMemoryCS';
import { getMatching } from '../../utils/key';
import { loadData } from '../dataLoader';
import { RBSegmentsCacheInMemory } from './RBSegmentsCacheInMemory';

/**
 * InMemory storage factory for standalone client-side SplitFactory
 *
 * @param params - parameters required by EventsCacheSync
 */
export function InMemoryStorageCSFactory(params: IStorageFactoryParams): IStorageSync {
  const { settings: { scheduler: { impressionsQueueSize, eventsQueueSize }, sync: { __splitFiltersValidation }, preloadedData }, onReadyFromCacheCb } = params;

  const splits = new SplitsCacheInMemory(__splitFiltersValidation);
  const rbSegments = new RBSegmentsCacheInMemory();
  const segments = new MySegmentsCacheInMemory();
  const largeSegments = new MySegmentsCacheInMemory();

  const storage = {
    splits,
    rbSegments,
    segments,
    largeSegments,
    impressions: new ImpressionsCacheInMemory(impressionsQueueSize),
    impressionCounts: new ImpressionCountsCacheInMemory(),
    events: new EventsCacheInMemory(eventsQueueSize),
    telemetry: shouldRecordTelemetry(params) ? new TelemetryCacheInMemory(splits, segments) : undefined,
    uniqueKeys: new UniqueKeysCacheInMemoryCS(),

    destroy() { },

    // When using shared instantiation with MEMORY we reuse everything but segments (they are unique per key)
    shared(matchingKey: string) {
      const segments = new MySegmentsCacheInMemory();
      const largeSegments = new MySegmentsCacheInMemory();

      if (preloadedData) {
        loadData(preloadedData, { segments, largeSegments }, matchingKey);
      }

      return {
        splits: this.splits,
        rbSegments: this.rbSegments,
        segments,
        largeSegments,
        impressions: this.impressions,
        impressionCounts: this.impressionCounts,
        events: this.events,
        telemetry: this.telemetry,
        uniqueKeys: this.uniqueKeys,

        destroy() { }
      };
    },
  };

  // @TODO revisit storage logic in localhost mode
  // No tracking in localhost mode to avoid memory leaks: https://github.com/splitio/javascript-commons/issues/181
  if (params.settings.mode === LOCALHOST_MODE) {
    const noopTrack = () => true;
    storage.impressions.track = noopTrack;
    storage.events.track = noopTrack;
    storage.impressionCounts.track = noopTrack;
    storage.uniqueKeys.track = noopTrack;
  }


  if (preloadedData) {
    loadData(preloadedData, storage, getMatching(params.settings.core.key));
    if (splits.getChangeNumber() > -1) onReadyFromCacheCb();
  }

  return storage;
}

InMemoryStorageCSFactory.type = STORAGE_MEMORY;
