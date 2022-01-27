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

// Telemetry
export const QUEUED = 0;
export const DROPPED = 1;
export const DEDUPED = 2;

export const STANDALONE_ENUM = 0;
export const CONSUMER_ENUM = 1;
export const CONSUMER_PARTIAL_ENUM = 2;

export const OPTIMIZED_ENUM = 0;
export const DEBUG_ENUM = 1;

export const SPLITS = 'sp';
export const IMPRESSIONS = 'im';
export const IMPRESSIONS_COUNT = 'ic';
export const EVENTS = 'ev';
export const TELEMETRY = 'te';
export const TOKEN = 'to';
export const SEGMENT = 'se';
export const MY_SEGMENT = 'ms';

export const TREATMENT = 't';
export const TREATMENTS = 'ts';
export const TREATMENT_WITH_CONFIG = 'tc';
export const TREATMENTS_WITH_CONFIG = 'tcs';
export const TRACK = 'tr';
