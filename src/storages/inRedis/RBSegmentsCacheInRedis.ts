import { isNaNNumber } from '../../utils/lang';
import { IRBSegmentsCacheAsync } from '../types';
import { ILogger } from '../../logger/types';
import { IRBSegment } from '../../dtos/types';
import { LOG_PREFIX } from './constants';
import { setToArray } from '../../utils/lang/sets';
import { RedisAdapter } from './RedisAdapter';
import { KeyBuilderSS } from '../KeyBuilderSS';

export class RBSegmentsCacheInRedis implements IRBSegmentsCacheAsync {

  private readonly log: ILogger;
  private readonly keys: KeyBuilderSS;
  private readonly redis: RedisAdapter;

  constructor(log: ILogger, keys: KeyBuilderSS, redis: RedisAdapter) {
    this.log = log;
    this.keys = keys;
    this.redis = redis;
  }

  get(name: string): Promise<IRBSegment | null> {
    return this.redis.get(this.keys.buildRBSegmentKey(name))
      .then(maybeRBSegment => maybeRBSegment && JSON.parse(maybeRBSegment));
  }

  private getNames(): Promise<string[]> {
    return this.redis.keys(this.keys.searchPatternForRBSegmentKeys()).then(
      (listOfKeys) => listOfKeys.map(this.keys.extractKey)
    );
  }

  contains(names: Set<string>): Promise<boolean> {
    const namesArray = setToArray(names);
    return this.getNames().then(namesInStorage => {
      return namesArray.every(name => namesInStorage.includes(name));
    });
  }

  update(toAdd: IRBSegment[], toRemove: IRBSegment[], changeNumber: number): Promise<boolean> {
    return Promise.all([
      this.setChangeNumber(changeNumber),
      Promise.all(toAdd.map(toAdd => {
        const key = this.keys.buildRBSegmentKey(toAdd.name);
        const stringifiedNewRBSegment = JSON.stringify(toAdd);
        return this.redis.set(key, stringifiedNewRBSegment).then(() => true);
      })),
      Promise.all(toRemove.map(toRemove => {
        const key = this.keys.buildRBSegmentKey(toRemove.name);
        return this.redis.del(key).then(status => status === 1);
      }))
    ]).then(([, added, removed]) => {
      return added.some(result => result) || removed.some(result => result);
    });
  }

  setChangeNumber(changeNumber: number) {
    return this.redis.set(this.keys.buildRBSegmentTillKey(), changeNumber + '').then(
      status => status === 'OK'
    );
  }

  getChangeNumber(): Promise<number> {
    return this.redis.get(this.keys.buildRBSegmentTillKey()).then((value: string | null) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from storage. Error: ' + e);
      return -1;
    });
  }

  // @TODO implement if required by DataLoader or producer mode
  clear() {
    return Promise.resolve(true);
  }

}
