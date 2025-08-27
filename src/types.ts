import SplitIO from '../types/splitio';
import { ISplitFiltersValidation } from './dtos/types';
import { ILogger } from './logger/types';
import { RolloutPlan } from './storages/dataLoader';

/**
 * SplitIO.ISettings interface extended with private properties for internal use
 */
export interface ISettings extends SplitIO.ISettings {
  readonly sync: SplitIO.ISettings['sync'] & {
    __splitFiltersValidation: ISplitFiltersValidation;
  };
  readonly log: ILogger;
  readonly initialRolloutPlan?: RolloutPlan;
}

/**
 * SplitIO.IStatusInterface interface extended with private properties for internal use
 */
export interface IStatusInterface extends SplitIO.IStatusInterface {
  // Expose status for internal purposes only. Not considered part of the public API, and might be updated eventually.
  __getStatus(): {
    isReady: boolean;
    isReadyFromCache: boolean;
    isTimedout: boolean;
    hasTimedout: boolean;
    isDestroyed: boolean;
    isOperational: boolean;
    lastUpdate: number;
  };
}
/**
 * SplitIO.IBasicClient interface extended with private properties for internal use
 */
export interface IBasicClient extends SplitIO.IBasicClient {
  /**
   * Flush data
   *
   * @returns A promise that is resolved when the flush is completed.
   */
  flush(): Promise<void>;
  // Whether the client implements the client-side API, i.e, with bound key, (true), or the server-side API (false/undefined).
  // Exposed for internal purposes only. Not considered part of the public API, and might be renamed eventually.
  isClientSide?: boolean;
  key?: SplitIO.SplitKey;
}
