// InMemory storage factory for standalone server-side SplitFactory
export { InMemoryStorageFactory } from './storages/inMemory/InMemoryStorage';
// InMemory storage factory for standalone client-side SplitFactory
export { InMemoryStorageCSFactory } from './storages/inMemory/InMemoryStorageCS';

// InMemory caches, reused to implement new storages
export { default as SplitsCacheInMemory } from './storages/inMemory/SplitsCacheInMemory';
export { default as MySegmentsCacheInMemory } from './storages/inMemory/MySegmentsCacheInMemory';
export { default as SegmentsCacheInMemory } from './storages/inMemory/SegmentsCacheInMemory';
export { default as EventsCacheInMemory } from './storages/inMemory/EventsCacheInMemory';
export { default as ImpressionsCacheInMemory } from './storages/inMemory/ImpressionsCacheInMemory';
export { default as LatenciesCacheInMemory } from './storages/inMemory/LatenciesCacheInMemory';
export { default as CountsCacheInMemory } from './storages/inMemory/CountsCacheInMemory';

// Utils for implementing new storages for standalone SplitFactory
export { default as AbstractSplitsCacheSync, usesSegments } from './storages/AbstractSplitsCacheSync';
export { default as AbstractSegmentsCacheSync } from './storages/AbstractSegmentsCacheSync';

// Evaluator:
export { evaluateFeature, evaluateFeatures } from './evaluator';

// Utils:
export { hash128 } from './utils/murmur3/murmur3_128';
export { hash } from './utils/murmur3/murmur3';
