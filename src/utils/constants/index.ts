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
export const NONE = 'NONE';

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

// Telemetry
export const QUEUED = 0;
export const DROPPED = 1;
export const DEDUPED = 2;

export const STANDALONE_ENUM = 0;
export const CONSUMER_ENUM = 1;
export const CONSUMER_PARTIAL_ENUM = 2;

export const OPTIMIZED_ENUM = 0;
export const DEBUG_ENUM = 1;
export const NONE_ENUM = 2;

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

export const CONNECTION_ESTABLISHED = 0;
export const OCCUPANCY_PRI = 10;
export const OCCUPANCY_SEC = 20;
export const STREAMING_STATUS = 30;
export const SSE_CONNECTION_ERROR = 40;
export const TOKEN_REFRESH = 50;
export const ABLY_ERROR = 60;
export const SYNC_MODE_UPDATE = 70;
export const AUTH_REJECTION = 80;

export const STREAMING = 0;
export const POLLING = 1;
export const REQUESTED = 0;
export const NON_REQUESTED = 1;
export const DISABLED = 0;
export const ENABLED = 1;
export const PAUSED = 2;
