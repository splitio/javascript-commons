import { splitsParserFromSettingsFactory } from './offline/splitsParser/splitsParserFromSettings';
import { syncManagerOfflineFactory } from './syncManagerOffline';
import { SplitIO } from '../types';
import { LOCALHOST_MODE } from '../utils/constants';

// Factory of Localhost SyncManager based on JS object.
export function LocalhostFromObject(): SplitIO.LocalhostFactory {
  const localhost = syncManagerOfflineFactory(splitsParserFromSettingsFactory);
  // @ts-ignore
  localhost.type = LOCALHOST_MODE;
  return localhost;
}
