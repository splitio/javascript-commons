const { splitApiFactory } = require('../services/splitApi');
const { syncManagerOnlineFactory } = require('../sync/syncManagerOnline');
const { pushManagerFactory } = require('../sync/streaming/pushManager');
const { pollingManagerSSFactory } = require('../sync/polling/pollingManagerSS');
const { InMemoryStorageFactory } = require('../storages/inMemory/InMemoryStorage');
const { sdkManagerFactory } = require('../sdkManager');
const { sdkClientMethodFactory } = require('../sdkClient/sdkClientMethod');
const { impressionObserverSSFactory } = require('../trackers/impressionObserver/impressionObserverSS');

const syncManagerOnlineSSFactory = syncManagerOnlineFactory(pollingManagerSSFactory, pushManagerFactory);

const serverSideModules = {
  storageFactory: InMemoryStorageFactory,
  splitApiFactory,
  syncManagerFactory: syncManagerOnlineSSFactory,
  sdkManagerFactory,
  sdkClientMethodFactory,
  impressionsObserverFactory: impressionObserverSSFactory,
};

module.exports = {
  serverSideModules,
};
