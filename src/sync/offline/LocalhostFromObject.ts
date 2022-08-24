import { splitsParserFromSettingsFactory } from './splitsParser/splitsParserFromSettings';
import { syncManagerOfflineFactory } from './syncManagerOffline';
import { LocalhostFactory } from '../../types';

// Singleton instance of the factory function for offline SyncManager from object (a.k.a. localhostFromObject)
// SDK instances instantiate their SyncManagers with the same factory
const localhostFromObject: any = syncManagerOfflineFactory(splitsParserFromSettingsFactory);
localhostFromObject.type = 'LocalhostFromObject';

export function LocalhostFromObject() {
  return localhostFromObject as LocalhostFactory;
}
