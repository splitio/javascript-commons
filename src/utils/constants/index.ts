import { StorageType } from '../../storages/types';
import { SDKMode } from '../../types';

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
export const LOCALHOST_MODE: SDKMode = 'localhost';
export const STANDALONE_MODE: SDKMode = 'standalone';
export const PRODUCER_MODE = 'producer';
export const CONSUMER_MODE: SDKMode = 'consumer';
export const CONSUMER_PARTIAL_MODE: SDKMode = 'consumer_partial';

// Storage types
export const STORAGE_MEMORY: StorageType = 'MEMORY';
export const STORAGE_LOCALSTORAGE: StorageType = 'LOCALSTORAGE';
export const STORAGE_REDIS: StorageType = 'REDIS';
export const STORAGE_PLUGGABLE: StorageType = 'PLUGGABLE';

// User consent
export const CONSENT_GRANTED = 'GRANTED'; // The user has granted consent for tracking events and impressions
export const CONSENT_DECLINED = 'DECLINED'; // The user has declined consent for tracking events and impressions
export const CONSENT_UNKNOWN = 'UNKNOWN'; // The user has neither granted nor declined consent for tracking events and impressions
