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
      .then((maybeRBSegment: string | null) => maybeRBSegment && JSON.parse(maybeRBSegment));
  }

  private getNames(): Promise<string[]> {
    return this.redis.keys(this.keys.searchPatternForRBSegmentKeys()).then(
      (listOfKeys: string[]) => listOfKeys.map(this.keys.extractKey)
    );
  }

  contains(names: Set<string>): Promise<boolean> {
    const namesArray = setToArray(names);
    return this.getNames().then(namesInStorage => {
      return namesArray.every(name => namesInStorage.includes(name));
    });
  }

  update(toAdd: IRBSegment[], toRemove: string[], changeNumber?: number): Promise<string[]> {
    return Promise.all([
      this.setChangeNumber(changeNumber),
      Promise.all(toAdd.map(rbSegment => this.add(rbSegment))),
      Promise.all(toRemove.map(name => this.remove(name)))
    ]).then(([, added, removed]) => {
      return toAdd.filter((_, i) => added[i]).map(rbSegment => rbSegment.name)
        .concat(toRemove.filter((_, i) => removed[i]));
    });
  }

  private add(rbSegment: IRBSegment): Promise<boolean> {
    const key = this.keys.buildRBSegmentKey(rbSegment.name);
    return this.get(rbSegment.name).then(previous => {
      if (previous && previous.changeNumber >= rbSegment.changeNumber) return false;

      const stringifiedNewRBSegment = JSON.stringify(rbSegment);
      return this.redis.set(key, stringifiedNewRBSegment).then(() => true);
    });
  }

  private remove(name: string): Promise<boolean> {
    const key = this.keys.buildRBSegmentKey(name);
    return this.redis.del(key).then((status: number) => status === 1);
  }

  setChangeNumber(changeNumber?: number) {
    if (changeNumber !== undefined) {
      return this.redis.set(this.keys.buildRBSegmentsTillKey(), changeNumber + '').then(
        (status: string | null) => status === 'OK'
      );
    }
  }

  getChangeNumber(): Promise<number> {
    return this.redis.get(this.keys.buildRBSegmentsTillKey()).then((value: string | null) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e: unknown) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from storage. Error: ' + e);
      return -1;
    });
  }

  // @TODO implement if required by DataLoader or producer mode
  clear() {
    return Promise.resolve();
  }

}
