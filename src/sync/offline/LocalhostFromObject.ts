import { splitsParserFromSettingsFactory } from './splitsParser/splitsParserFromSettings';
import { syncManagerOfflineFactory } from './syncManagerOffline';
import { SplitIO } from '../../types';

// Factory of Localhost SyncManager based on JS object.
export function LocalhostFromObject(): SplitIO.LocalhostFactory {
  const localhost = syncManagerOfflineFactory(splitsParserFromSettingsFactory) as SplitIO.LocalhostFactory;
  localhost.type = 'LocalhostFromObject';
  return localhost;
}
