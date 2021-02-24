import AbstractSegmentsCacheSync from '../AbstractSegmentsCacheSync';
import { logFactory } from '../../logger/sdkLogger';
import KeyBuilderCS from '../KeyBuilderCS';
const log = logFactory('splitio-storage:localstorage');

const DEFINED = '1';

export default class MySegmentsCacheInLocal extends AbstractSegmentsCacheSync {

  private readonly keys: KeyBuilderCS;

  constructor(keys: KeyBuilderCS) {
    super();
    this.keys = keys;
    // There is not need to flush segments cache like splits cache, since resetSegments receives the up-to-date list of active segments
  }

  /**
   * Removes list of segments from localStorage
   * @NOTE this method is not being used at the moment.
   */
  clear() {
    log.i('Flushing MySegments data from localStorage');

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
      log.e(e);
      return false;
    }
  }

  removeFromSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      localStorage.removeItem(segmentKey);
      return true;
    } catch (e) {
      log.e(e);
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
      const name = this.keys.extractSegmentName(key);

      if (name) accum.push(name);

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

}
