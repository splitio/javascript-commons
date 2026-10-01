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

  update(toAdd: IRBSegment[], toRemove: string[], changeNumber?: number): Promise<string[]> {
    return Promise.all([
      this.setChangeNumber(changeNumber),
      Promise.all(toAdd.map(rbSegment => this.add(rbSegment))),
      Promise.all(toRemove.map(name => this.remove(name)))
    ]).then(([, added, removed]) => {
      return toRemove.filter((_, i) => removed[i])
        .concat(toAdd.filter((_, i) => added[i]).map(rbSegment => rbSegment.name));
    });
  }

  private add(rbSegment: IRBSegment): Promise<boolean> {
    const key = this.keys.buildRBSegmentKey(rbSegment.name);
    return this.get(rbSegment.name).then(previous => {
      if (previous && previous.changeNumber >= rbSegment.changeNumber) return false;

      const stringifiedNewRBSegment = JSON.stringify(rbSegment);
      return this.wrapper.set(key, stringifiedNewRBSegment).then(() => true);
    });
  }

  private remove(name: string): Promise<boolean> {
    const key = this.keys.buildRBSegmentKey(name);
    return this.wrapper.del(key);
  }

  setChangeNumber(changeNumber?: number) {
    if (changeNumber !== undefined) {
      return this.wrapper.set(this.keys.buildRBSegmentsTillKey(), changeNumber + '');
    }
  }

  getChangeNumber(): Promise<number> {
    return this.wrapper.get(this.keys.buildRBSegmentsTillKey()).then((value) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from storage. Error: ' + e);
      return -1;
    });
  }

  // @TODO implement if required by DataLoader or producer mode
  clear() {
    return Promise.resolve();
  }

}
