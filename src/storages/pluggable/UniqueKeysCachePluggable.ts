import { IPluggableStorageWrapper, IUniqueKeysCacheBase } from '../types';
import { UniqueKeysCacheInMemory } from '../inMemory/UniqueKeysCacheInMemory';
import { setToArray } from '../../utils/lang/sets';
import { DEFAULT_CACHE_SIZE, REFRESH_RATE } from '../inRedis/constants';
import { LOG_PREFIX } from './constants';
import { ILogger } from '../../logger/types';
import { UniqueKeysItemSs } from '../../sync/submitters/types';

export class UniqueKeysCachePluggable extends UniqueKeysCacheInMemory implements IUniqueKeysCacheBase {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly wrapper: IPluggableStorageWrapper;
  private readonly refreshRate: number;
  private intervalId: any;

  constructor(log: ILogger, key: string, wrapper: IPluggableStorageWrapper, uniqueKeysQueueSize = DEFAULT_CACHE_SIZE, refreshRate = REFRESH_RATE) {
    super(uniqueKeysQueueSize);
    this.log = log;
    this.key = key;
    this.wrapper = wrapper;
    this.refreshRate = refreshRate;
    this.onFullQueue = () => { this.storeUniqueKeys(); };
  }

  storeUniqueKeys() {
    const featureNames = Object.keys(this.uniqueKeysTracker);
    if (!featureNames.length) return Promise.resolve(false);

    const uniqueKeysArray = featureNames.map((featureName) => {
      const featureKeys = setToArray(this.uniqueKeysTracker[featureName]);
      const uniqueKeysPayload = {
        f: featureName,
        ks: featureKeys
      };
      return JSON.stringify(uniqueKeysPayload);
    });

    this.clear();
    return this.wrapper.pushItems(this.key, uniqueKeysArray)
      .catch(err => {
        this.log.error(`${LOG_PREFIX}Error in uniqueKeys pipeline: ${err}.`);
        return false;
      });
  }


  start() {
    this.intervalId = setInterval(this.storeUniqueKeys.bind(this), this.refreshRate);
  }

  stop() {
    clearInterval(this.intervalId);
    return this.storeUniqueKeys();
  }

  /**
   * Async consumer API, used by synchronizer.
   * @param count number of items to pop from the queue. If not provided or equal 0, all items will be popped.
   */
  popNRaw(count = 0): Promise<UniqueKeysItemSs[]> {
    return Promise.resolve(count || this.wrapper.getItemsCount(this.key))
      .then(count => this.wrapper.popItems(this.key, count))
      .then((uniqueKeyItems) => uniqueKeyItems.map(uniqueKeyItem => JSON.parse(uniqueKeyItem)));
  }

}
