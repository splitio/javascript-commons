import { ISignalListener } from '../listeners/types';
import { ISdkReadinessManager } from '../readiness/types';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { ISyncManager } from '../sync/types';
import { IEventTracker, IImpressionsTracker } from '../trackers/types';
import { ISettings } from '../types';

export interface IClientFactoryParams {
  storage: IStorageSync | IStorageAsync,
  sdkReadinessManager: ISdkReadinessManager,
  settings: ISettings
  impressionsTracker: IImpressionsTracker,
  eventTracker: IEventTracker,
  // @TODO add time tracker and metricCollectors (a.k.a metricTracker)?
}

export interface ISdkClientFactoryParams extends IClientFactoryParams {
  signalListener?: ISignalListener
  syncManager?: ISyncManager,
  sharedClient?: boolean
}
