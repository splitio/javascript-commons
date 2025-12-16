import { splitApiFactory } from '../services/splitApi';
import { syncManagerOnlineFactory } from '../sync/syncManagerOnline';
import { pushManagerFactory } from '../sync/streaming/pushManager';
import { pollingManagerSSFactory } from '../sync/polling/pollingManagerSS';
import { InMemoryStorageFactory } from '../storages/inMemory/InMemoryStorage';
import { sdkManagerFactory } from '../sdkManager';
import { sdkClientMethodFactory } from '../sdkClient/sdkClientMethod';
import { impressionObserverSSFactory } from '../trackers/impressionObserver/impressionObserverSS';

const syncManagerOnlineSSFactory = syncManagerOnlineFactory(pollingManagerSSFactory, pushManagerFactory);

export const serverSideModules = {
  storageFactory: InMemoryStorageFactory,
  splitApiFactory,
  syncManagerFactory: syncManagerOnlineSSFactory,
  sdkManagerFactory,
  sdkClientMethodFactory,
  impressionsObserverFactory: impressionObserverSSFactory,
};
