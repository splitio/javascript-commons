import { isNaNNumber } from '../../utils/lang';
import { KeyBuilder } from '../KeyBuilder';
import { IPluggableStorageWrapper, IRBSegmentsCacheAsync } from '../types';
import { ILogger } from '../../logger/types';
import { IRBSegment } from '../../dtos/types';
import { LOG_PREFIX } from './constants';
import { setToArray } from '../../utils/lang/sets';

export class RBSegmentsCachePluggable implements IRBSegmentsCacheAsync {

  private readonly log: ILogger;
  private readonly keys: KeyBuilder;
  private readonly wrapper: IPluggableStorageWrapper;

  constructor(log: ILogger, keys: KeyBuilder, wrapper: IPluggableStorageWrapper) {
    this.log = log;
    this.keys = keys;
    this.wrapper = wrapper;
  }

  get(name: string): Promise<IRBSegment | null> {
    return this.wrapper.get(this.keys.buildRBSegmentKey(name))
      .then(maybeRBSegment => maybeRBSegment && JSON.parse(maybeRBSegment));
  }

  private getNames(): Promise<string[]> {
    return this.wrapper.getKeysByPrefix(this.keys.buildRBSegmentKeyPrefix()).then(
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
        return this.wrapper.set(key, stringifiedNewRBSegment).then(() => true);
      })),
      Promise.all(toRemove.map(toRemove => {
        const key = this.keys.buildRBSegmentKey(toRemove.name);
        return this.wrapper.del(key);
      }))
    ]).then(([, added, removed]) => {
      return added.some(result => result) || removed.some(result => result);
    });
  }

  setChangeNumber(changeNumber: number) {
    return this.wrapper.set(this.keys.buildRBSegmentTillKey(), changeNumber + '');
  }

  getChangeNumber(): Promise<number> {
    return this.wrapper.get(this.keys.buildRBSegmentTillKey()).then((value) => {
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
