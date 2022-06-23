import { ILogger } from '../../logger/types';
import { AbstractSegmentsCacheSync } from '../AbstractSegmentsCacheSync';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { LOG_PREFIX, DEFINED } from './constants';

export class MySegmentsCacheInLocal extends AbstractSegmentsCacheSync {

  private readonly keys: KeyBuilderCS;
  private readonly log: ILogger;

  constructor(log: ILogger, keys: KeyBuilderCS) {
    super();
    this.log = log;
    this.keys = keys;
    // There is not need to flush segments cache like splits cache, since resetSegments receives the up-to-date list of active segments
  }

  /**
   * Removes list of segments from localStorage
   * @NOTE this method is not being used at the moment.
   */
  clear() {
    this.log.info(LOG_PREFIX + 'Flushing MySegments data from localStorage');

    // We cannot simply call `localStorage.clear()` since that implies removing user items from the storage
    // We could optimize next sentence, since it implies iterating over all localStorage items
    this.resetSegments([]);
  }

  addToSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      localStorage.setItem(segmentKey, DEFINED);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  removeFromSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      localStorage.removeItem(segmentKey);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  isInSegment(name: string): boolean {
    return localStorage.getItem(this.keys.buildSegmentNameKey(name)) === DEFINED;
  }

  /**
   * Reset (update) the cached list of segments with the given list, removing and adding segments if necessary.
   *
   * @param {string[]} segmentNames list of segment names
   * @returns boolean indicating if the cache was updated (i.e., given list was different from the cached one)
   */
  resetSegments(names: string[]): boolean {
    let isDiff = false;
    let index;

    // Scan current values from localStorage
    const storedSegmentNames = Object.keys(localStorage).reduce((accum, key) => {
      let segmentName = this.keys.extractSegmentName(key);

      if (segmentName) {
        accum.push(segmentName);
      } else {
        // @TODO @BREAKING: This is only to clean up "old" keys. Remove this whole else code block and reuse `getRegisteredSegments` method.
        segmentName = this.keys.extractOldSegmentKey(key);

        if (segmentName) { // this was an old segment key, let's clean up.
          const newSegmentKey = this.keys.buildSegmentNameKey(segmentName);
          try {
            // If the new format key is not there, create it.
            if (!localStorage.getItem(newSegmentKey) && names.indexOf(segmentName) > -1) {
              localStorage.setItem(newSegmentKey, DEFINED);
              // we are migrating a segment, let's track it.
              accum.push(segmentName);
            }
            localStorage.removeItem(key); // we migrated the current key, let's delete it.
          } catch (e) {
            this.log.error(e);
          }
        }
      }

      return accum;
    }, [] as string[]);

    // Extreme fast => everything is empty
    if (names.length === 0 && storedSegmentNames.length === names.length)
      return isDiff;

    // Quick path
    if (storedSegmentNames.length !== names.length) {
      isDiff = true;

      storedSegmentNames.forEach(name => this.removeFromSegment(name));
      names.forEach(name => this.addToSegment(name));
    } else {
      // Slowest path => we need to find at least 1 difference because
      for (index = 0; index < names.length && storedSegmentNames.indexOf(names[index]) !== -1; index++) {
        // TODO: why empty statement?
      }

      if (index < names.length) {
        isDiff = true;

        storedSegmentNames.forEach(name => this.removeFromSegment(name));
        names.forEach(name => this.addToSegment(name));
      }
    }

    return isDiff;
  }

  getRegisteredSegments(): string[] {
    return Object.keys(localStorage).reduce<string[]>((accum, key) => {
      const segmentName = this.keys.extractSegmentName(key);
      if (segmentName) accum.push(segmentName);
      return accum;
    }, []);
  }

  getKeysCount() {
    return 1;
  }

}
