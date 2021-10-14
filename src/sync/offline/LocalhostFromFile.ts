import { splitsParserFromFileFactory } from './splitsParser/splitsParserFromFile';
import { syncManagerOfflineFactory } from './syncManagerOffline';
import { SplitIO } from '../../types';

// Factory of Localhost SyncManager based on yaml file.
// Requires Node 'fs' and 'path' APIs.
export function LocalhostFromFile(): SplitIO.LocalhostFactory {
  const localhost = syncManagerOfflineFactory(splitsParserFromFileFactory) as SplitIO.LocalhostFactory;
  localhost.type = 'LocalhostFromFile';
  return localhost;
}
