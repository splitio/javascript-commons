import { InMemoryStorageCSFactory } from '../../../storages/inMemory/InMemoryStorageCS';
import { ISettings } from '../../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { LocalhostFromObject } from '../../../sync/offline/LocalhostFromObject';

export const settingsWithKey = {
  core: {
    key: 'some_key'
  },
  startup: {
    readyTimeout: 1,
  },
  log: loggerMock
};

export const settingsWithKeyAndTT = {
  core: {
    key: 'some_key',
    trafficType: 'some_tt'
  },
  startup: {
    readyTimeout: 1,
  },
  log: loggerMock
};

export const settingsWithKeyObject = {
  core: {
    key: {
      matchingKey: 'some_key',
      bucketingKey: 'some_bucketing'
    }
  },
  startup: {
    readyTimeout: 1,
  },
  log: loggerMock
};

export const fullSettings: ISettings = {
  core: {
    authorizationKey: 'aaaabbbbcccc1234',
    key: 'some_key',
    labelsEnabled: false,
    IPAddressesEnabled: false
  },
  scheduler: {
    featuresRefreshRate: 1,
    impressionsRefreshRate: 1,
    metricsRefreshRate: 1,
    segmentsRefreshRate: 1,
    offlineRefreshRate: 1,
    eventsPushRate: 1,
    eventsQueueSize: 1,
    impressionsQueueSize: 1,
    pushRetryBackoffBase: 1
  },
  startup: {
    readyTimeout: 1,
    requestTimeoutBeforeReady: 1,
    retriesOnFailureBeforeReady: 1,
    eventsFirstPushWindow: 1
  },
  features: 'path/to/file',
  storage: InMemoryStorageCSFactory,
  integrations: [() => { }], //  A no-op integration
  mode: 'standalone',
  debug: false,
  streamingEnabled: true,
  sync: {
    splitFilters: [],
    impressionsMode: 'OPTIMIZED',
    localhostMode: LocalhostFromObject(),
    __splitFiltersValidation: {
      validFilters: [],
      queryString: null,
      groupedFilters: { byName: [], byPrefix: [] }
    }
  },
  version: 'jest',
  runtime: {
    ip: false,
    hostname: false
  },
  urls: {
    events: 'events',
    sdk: 'sdk',
    auth: 'auth',
    streaming: 'streaming'
  },
  log: loggerMock
};

export const fullSettingsServerSide = {
  ...fullSettings,
  core: {
    ...fullSettings.core,
    key: undefined,
  },
  features: '.split'
};

export const settingsSplitApi = {
  core: {
    authorizationKey: 'api-key'
  },
  version: 'jest',
  urls: {
    events: 'events',
    sdk: 'sdk',
    auth: 'auth',
    streaming: 'streaming'
  },
  sync: {
    impressionsMode: 'DEBUG'
  },
  runtime: {
    ip: false,
    hostname: false
  },
  log: loggerMock
};
