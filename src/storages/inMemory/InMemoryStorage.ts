import { SplitsCacheInMemory } from './SplitsCacheInMemory';
import { SegmentsCacheInMemory } from './SegmentsCacheInMemory';
import { ImpressionsCacheInMemory } from './ImpressionsCacheInMemory';
import { EventsCacheInMemory } from './EventsCacheInMemory';
import { IStorageFactoryParams, IStorageSync } from '../types';
import { ImpressionCountsCacheInMemory } from './ImpressionCountsCacheInMemory';
import { DEBUG, LOCALHOST_MODE, NONE, STORAGE_MEMORY } from '../../utils/constants';
import { shouldRecordTelemetry, TelemetryCacheInMemory } from './TelemetryCacheInMemory';
import { UniqueKeysCacheInMemory } from './UniqueKeysCacheInMemory';

/**
 * InMemory storage factory for standalone server-side SplitFactory
 *
 * @param params - parameters required by EventsCacheSync
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

    destroy() { }
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
