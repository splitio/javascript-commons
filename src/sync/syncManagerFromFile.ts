import { splitsParserFromFileFactory } from './offline/splitsParser/splitsParserFromFile';
import { syncManagerOfflineFactory } from './syncManagerOffline';
import { SplitIO } from '../types';
import { LOCALHOST_MODE } from '../utils/constants';

// Factory of Localhost SyncManager based on yaml file.
// Requires Node 'fs' and 'path' APIs.
export function LocalhostFromFile(): SplitIO.LocalhostFactory {
  const localhost = syncManagerOfflineFactory(splitsParserFromFileFactory);
  // @ts-ignore
  localhost.type = LOCALHOST_MODE;
  return localhost;
}
