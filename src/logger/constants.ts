/**
 * Message codes used to trim string log messages from commons and client-side API modules,
 * in order to reduce the minimal SDK size for Browser and eventually other client-side environments.
 *
 * Modules related to the server-side API (e.g., segmentsSyncTask), platform-specific components (e.g., signal listeners)
 * and pluggable components (e.g., pluggable integrations & storages) can use the logger with string literals.
 */
export const ENGINE_COMBINER_AND = 0;
export const ENGINE_COMBINER_IFELSEIF = 1;
export const ENGINE_COMBINER_IFELSEIF_NO_TREATMENT = 2;
export const ENGINE_BUCKET = 3;
export const ENGINE_MATCHER_DEPENDENCY = 10;
export const ENGINE_MATCHER_DEPENDENCY_PRE = 11;
export const ENGINE_VALUE = 23;
export const ENGINE_SANITIZE = 24;
export const CLEANUP_REGISTERING = 25;
export const CLEANUP_DEREGISTERING = 26;
export const RETRIEVE_CLIENT_DEFAULT = 27;
export const RETRIEVE_CLIENT_EXISTING = 28;
export const RETRIEVE_MANAGER = 29;
export const SYNC_OFFLINE_DATA = 30;
export const SYNC_SPLITS_FETCH = 31;
export const SYNC_SPLITS_UPDATE = 32;
export const SYNC_RBS_UPDATE = 33;
export const STREAMING_NEW_MESSAGE = 35;
export const SYNC_TASK_START = 36;
export const SYNC_TASK_EXECUTE = 37;
export const SYNC_TASK_STOP = 38;
export const SETTINGS_SPLITS_FILTER = 39;
export const ENGINE_MATCHER_RESULT = 40;
export const ENGINE_DEFAULT = 41;

export const CLIENT_READY_FROM_CACHE = 100;
export const CLIENT_READY = 101;
export const IMPRESSION = 102;
export const IMPRESSION_QUEUEING = 103;
export const NEW_SHARED_CLIENT = 104;
export const NEW_FACTORY = 105;
export const POLLING_SMART_PAUSING = 106;
export const POLLING_START = 107;
export const POLLING_STOP = 108;
export const SYNC_SPLITS_FETCH_RETRY = 109;
export const STREAMING_REFRESH_TOKEN = 110;
export const STREAMING_RECONNECT = 111;
export const STREAMING_CONNECTING = 112;
export const STREAMING_DISABLED = 113;
export const STREAMING_DISCONNECTING = 114;
export const SUBMITTERS_PUSH_FULL_QUEUE = 115;
export const SUBMITTERS_PUSH = 116;
export const SYNC_START_POLLING = 117;
export const SYNC_CONTINUE_POLLING = 118;
export const SYNC_STOP_POLLING = 119;
export const EVENTS_TRACKER_SUCCESS = 120;
export const IMPRESSIONS_TRACKER_SUCCESS = 121;
export const USER_CONSENT_UPDATED = 122;
export const USER_CONSENT_NOT_UPDATED = 123;
export const USER_CONSENT_INITIAL = 124;

export const ENGINE_VALUE_INVALID = 200;
export const ENGINE_VALUE_NO_ATTRIBUTES = 201;
export const CLIENT_NO_LISTENER = 202;
export const CLIENT_NOT_READY = 203;
export const SYNC_MYSEGMENTS_FETCH_RETRY = 204;
export const SYNC_SPLITS_FETCH_FAILS = 205;
export const STREAMING_PARSING_ERROR_FAILS = 206;
export const STREAMING_PARSING_MESSAGE_FAILS = 207;
export const STREAMING_FALLBACK = 208;
export const SUBMITTERS_PUSH_FAILS = 209;
export const SUBMITTERS_PUSH_RETRY = 210;
export const WARN_SETTING_NULL = 211;
export const WARN_TRIMMING_PROPERTIES = 212;
export const WARN_CONVERTING = 213;
export const WARN_TRIMMING = 214;
export const WARN_NOT_EXISTENT_SPLIT = 215;
export const WARN_LOWERCASE_TRAFFIC_TYPE = 216;
export const WARN_NOT_EXISTENT_TT = 217;
export const WARN_INTEGRATION_INVALID = 218;
export const WARN_SPLITS_FILTER_IGNORED = 219;
export const WARN_SPLITS_FILTER_INVALID = 220;
export const WARN_SPLITS_FILTER_EMPTY = 221;
export const WARN_SDK_KEY = 222;
export const STREAMING_PARSING_MEMBERSHIPS_UPDATE = 223;
export const STREAMING_PARSING_SPLIT_UPDATE = 224;
export const WARN_INVALID_FLAGSET = 225;
export const WARN_LOWERCASE_FLAGSET = 226;
export const WARN_FLAGSET_NOT_CONFIGURED = 227;
export const WARN_FLAGSET_WITHOUT_FLAGS = 228;

export const ERROR_ENGINE_COMBINER_IFELSEIF = 300;
export const ERROR_LOGLEVEL_INVALID = 301;
export const ERROR_CLIENT_LISTENER = 302;
export const ERROR_CLIENT_CANNOT_GET_READY = 303;
export const ERROR_SYNC_OFFLINE_LOADING = 304;
export const ERROR_STREAMING_SSE = 305;
export const ERROR_STREAMING_AUTH = 306;
export const ERROR_IMPRESSIONS_TRACKER = 307;
export const ERROR_IMPRESSIONS_LISTENER = 308;
export const ERROR_EVENTS_TRACKER = 309;
export const ERROR_EVENT_TYPE_FORMAT = 310;
export const ERROR_NOT_PLAIN_OBJECT = 311;
export const ERROR_SIZE_EXCEEDED = 312;
export const ERROR_NOT_FINITE = 313;
export const ERROR_CLIENT_DESTROYED = 314;
export const ERROR_NULL = 315;
export const ERROR_TOO_LONG = 316;
export const ERROR_INVALID_KEY_OBJECT = 317;
export const ERROR_INVALID = 318;
export const ERROR_EMPTY = 319;
export const ERROR_EMPTY_ARRAY = 320;
export const ERROR_INVALID_CONFIG_PARAM = 321;
export const ERROR_HTTP = 322;
export const ERROR_STORAGE_INVALID = 324;
export const ERROR_NOT_BOOLEAN = 325;
export const ERROR_MIN_CONFIG_PARAM = 326;
export const ERROR_TOO_MANY_SETS = 327;
export const ERROR_SETS_FILTER_EXCLUSIVE = 328;
export const ENGINE_MATCHER_ERROR = 329;

// Log prefixes (a.k.a. tags or categories)
export const LOG_PREFIX_SETTINGS = 'settings';
export const LOG_PREFIX_INSTANTIATION = 'Factory instantiation';
export const LOG_PREFIX_CLIENT_INSTANTIATION = 'Client instantiation';
export const LOG_PREFIX_ENGINE = 'engine';
export const LOG_PREFIX_ENGINE_COMBINER = LOG_PREFIX_ENGINE + ':combiner: ';
export const LOG_PREFIX_ENGINE_MATCHER = LOG_PREFIX_ENGINE + ':matcher: ';
export const LOG_PREFIX_ENGINE_VALUE = LOG_PREFIX_ENGINE + ':value: ';
export const LOG_PREFIX_SYNC = 'sync';
export const LOG_PREFIX_SYNC_MANAGER = LOG_PREFIX_SYNC + ':sync-manager: ';
export const LOG_PREFIX_SYNC_OFFLINE = LOG_PREFIX_SYNC + ':offline: ';
export const LOG_PREFIX_SYNC_STREAMING = LOG_PREFIX_SYNC + ':streaming: ';
export const LOG_PREFIX_SYNC_SPLITS = LOG_PREFIX_SYNC + ':featureflag-changes: ';
export const LOG_PREFIX_SYNC_SEGMENTS = LOG_PREFIX_SYNC + ':segment-changes: ';
export const LOG_PREFIX_SYNC_MYSEGMENTS = LOG_PREFIX_SYNC + ':my-segments: ';
export const LOG_PREFIX_SYNC_POLLING = LOG_PREFIX_SYNC + ':polling-manager: ';
export const LOG_PREFIX_SYNC_SUBMITTERS = LOG_PREFIX_SYNC + ':submitter: ';
export const LOG_PREFIX_IMPRESSIONS_TRACKER = 'impressions-tracker: ';
export const LOG_PREFIX_EVENTS_TRACKER = 'events-tracker: ';
export const LOG_PREFIX_UNIQUE_KEYS_TRACKER = 'unique-keys-tracker: ';
export const LOG_PREFIX_CLEANUP = 'cleanup: ';
