import { ILogger } from '../../logger/types';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { REFRESH_RATE } from '../inRedis/constants';
import { IPluggableStorageWrapper } from '../types';
import { LOG_PREFIX } from './constants';

export class ImpressionCountsCachePluggable extends ImpressionCountsCacheInMemory {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly wrapper: IPluggableStorageWrapper;
  private readonly refreshRate: number;
  private intervalId: any;

  constructor(log: ILogger, key: string, wrapper: IPluggableStorageWrapper, impressionCountsCacheSize?: number, refreshRate = REFRESH_RATE) {
    super(impressionCountsCacheSize);
    this.log = log;
    this.key = key;
    this.wrapper = wrapper;
    this.refreshRate = refreshRate;
    this.onFullQueue = () => { this.storeImpressionCounts(); };
  }

  private storeImpressionCounts() {
    const counts = this.pop();
    const keys = Object.keys(counts);
    if (!keys) return Promise.resolve(false);

    const pipeline = keys.reduce<Promise<any>>((pipeline, key) => {
      return pipeline.then(() => this.wrapper.incr(`${this.key}::${key}`, counts[key]));
    }, Promise.resolve());

    return pipeline.catch(err => {
      this.log.error(`${LOG_PREFIX}Error in impression counts pipeline: ${err}.`);
      return false;
    });
  }

  start() {
    this.intervalId = setInterval(this.storeImpressionCounts.bind(this), this.refreshRate);
  }

  stop() {
    clearInterval(this.intervalId);
    return this.storeImpressionCounts();
  }
}
