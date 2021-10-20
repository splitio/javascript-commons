import { splitsParserFromFileFactory } from './splitsParser/splitsParserFromFile';
import { syncManagerOfflineFactory } from './syncManagerOffline';
import { SplitIO } from '../../types';

// Singleton instance of the factory function for offline SyncManager from YAML file (a.k.a. localhostFromFile)
// Requires Node 'fs' and 'path' APIs.
const localhostFromFile = syncManagerOfflineFactory(splitsParserFromFileFactory) as SplitIO.LocalhostFactory;
localhostFromFile.type = 'LocalhostFromFile';

export function LocalhostFromFile(): SplitIO.LocalhostFactory {
  return localhostFromFile;
}
