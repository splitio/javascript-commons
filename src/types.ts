import SplitIO from '../types/splitio';
import { ISplitFiltersValidation } from './dtos/types';
import { ILogger } from './logger/types';

/**
 * SplitIO.ISettings interface extended with private properties for internal use
 */
export interface ISettings extends SplitIO.ISettings {
  readonly sync: SplitIO.ISettings['sync'] & {
    __splitFiltersValidation: ISplitFiltersValidation;
  };
  readonly runtime: {
    ip: string | false;
    hostname: string | false;
  };
  readonly log: ILogger;
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
   * @function flush
   * @return {Promise<void>}
   */
  flush(): Promise<void>;
  // Whether the client implements the client-side API, i.e, with bound key, (true), or the server-side API (false/undefined).
  // Exposed for internal purposes only. Not considered part of the public API, and might be renamed eventually.
  isClientSide?: boolean;
  key?: SplitIO.SplitKey;
}
/**
 * Defines the format of rollout plan data to preload the factory storage (cache).
 */
export interface PreloadedData {
  /**
   * Timestamp of the last moment the data was synchronized with Split servers.
   * If this value is older than 10 days ago (expiration time policy), the data is not used to update the storage content.
   * @TODO configurable expiration time policy?
   */
  lastUpdated: number;
  /**
   * Change number of the preloaded data.
   * If this value is older than the current changeNumber at the storage, the data is not used to update the storage content.
   */
  since: number;
  /**
   * Map of feature flags to their stringified definitions.
   */
  splitsData: {
    [splitName: string]: string;
  };
  /**
   * Optional map of user keys to their list of segments.
   * @TODO remove when releasing first version
   */
  mySegmentsData?: {
    [key: string]: string[];
  };
  /**
   * Optional map of segments to their stringified definitions.
   * This property is ignored if `mySegmentsData` was provided.
   */
  segmentsData?: {
    [segmentName: string]: string;
  };
}
