// InMemory storage factory for standalone server-side SplitFactory
export { InMemoryStorageFactory } from './storages/inMemory/InMemoryStorage';

// InMemory storage factory for standalone client-side SplitFactory
export { InMemoryStorageCSFactory } from './storages/inMemory/InMemoryStorageCS';

// InLocalStorage factory for standalone client-side SplitFactory in Web browsers
export { InLocalStorage } from './storages/inLocalStorage';

// Pluggable storage factory for consumer/producer mode
export { PluggableStorage } from './storages/pluggable';

// Pluggable storage factory for consumer/producer mode
export { InRedisStorage } from './storages/inRedis';
