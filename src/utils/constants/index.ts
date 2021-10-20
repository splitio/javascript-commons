import { StorageType } from '../../storages/types';

// Special treatments
export const CONTROL = 'control';
export const CONTROL_WITH_CONFIG = {
  treatment: CONTROL,
  config: null
};

// Constants for unknown and not-applicable values
export const UNKNOWN = 'unknown';
export const NA = 'NA';

// Integration data types
export const SPLIT_IMPRESSION = 'IMPRESSION';
export const SPLIT_EVENT = 'EVENT';

// Impression collection modes
export const DEBUG = 'DEBUG';
export const OPTIMIZED = 'OPTIMIZED';

// SDK Modes
export const LOCALHOST_MODE = 'localhost';
export const STANDALONE_MODE = 'standalone';
export const PRODUCER_MODE = 'producer';
export const CONSUMER_MODE = 'consumer';

// Storage types
export const STORAGE_MEMORY: StorageType = 'MEMORY';
export const STORAGE_LOCALSTORAGE: StorageType = 'LOCALSTORAGE';
export const STORAGE_REDIS: StorageType = 'REDIS';
export const STORAGE_CUSTOM: StorageType = 'CUSTOM';
