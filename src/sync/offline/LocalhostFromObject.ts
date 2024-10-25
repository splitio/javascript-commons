import { splitsParserFromSettingsFactory } from './splitsParser/splitsParserFromSettings';
import { syncManagerOfflineFactory } from './syncManagerOffline';

// Singleton instance of the factory function for offline SyncManager from object
// SDK instances instantiate their SyncManagers with the same factory
export const localhostFromObjectFactory = syncManagerOfflineFactory(splitsParserFromSettingsFactory);
