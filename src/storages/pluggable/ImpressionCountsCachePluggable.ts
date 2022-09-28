import { ILogger } from '../../logger/types';
import { ImpressionCountsPayload } from '../../sync/submitters/types';
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
    if (!keys.length) return Promise.resolve(false);

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

  // Async consumer API, used by synchronizer
  getImpressionsCount(): Promise<ImpressionCountsPayload | undefined> {
    return this.wrapper.getKeysByPrefix(this.key)
      .then(keys => {
        return keys.length ? Promise.all(keys.map(key => this.wrapper.get(key)))
          .then(counts => {
            keys.forEach(key => this.wrapper.del(key).catch(() => { /* noop */ }));

            const pf = [];

            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              const count = counts[i];

              const keyFeatureNameAndTime = key.split('::');
              if (keyFeatureNameAndTime.length !== 3) {
                this.log.error(`${LOG_PREFIX}Error spliting key ${key}`);
                continue;
              }

              const timeFrame = parseInt(keyFeatureNameAndTime[2]);
              if (isNaN(timeFrame)) {
                this.log.error(`${LOG_PREFIX}Error parsing time frame ${keyFeatureNameAndTime[2]}`);
                continue;
              }
              // @ts-ignore
              const rawCount = parseInt(count);
              if (isNaN(rawCount)) {
                this.log.error(`${LOG_PREFIX}Error parsing raw count ${count}`);
                continue;
              }

              pf.push({
                f: keyFeatureNameAndTime[1],
                m: timeFrame,
                rc: rawCount,
              });
            }

            return { pf };
          }) : undefined;
      });
  }
}
