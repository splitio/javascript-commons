import { splitsParserFromSettingsFactory } from './splitsParser/splitsParserFromSettings';
import { syncManagerOfflineFactory } from './syncManagerOffline';
import { SplitIO } from '../../types';

// Singleton instance of the factory function for offline SyncManager from object (a.k.a. localhostFromObject)
// SDK instances instantiate their SyncManagers with the same factory
const localhostFromObject = syncManagerOfflineFactory(splitsParserFromSettingsFactory) as SplitIO.LocalhostFactory;
localhostFromObject.type = 'LocalhostFromObject';

export function LocalhostFromObject(): SplitIO.LocalhostFactory {
  return localhostFromObject;
}
