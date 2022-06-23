import { AbstractSegmentsCacheSync } from '../AbstractSegmentsCacheSync';

/**
 * Default MySegmentsCacheInMemory implementation that stores MySegments in memory.
 * Supported by all JS runtimes.
 */
export class MySegmentsCacheInMemory extends AbstractSegmentsCacheSync {

  private segmentCache: Record<string, boolean> = {};

  clear() {
    this.segmentCache = {};
  }

  addToSegment(name: string): boolean {
    this.segmentCache[name] = true;

    return true;
  }

  removeFromSegment(name: string): boolean {
    delete this.segmentCache[name];

    return true;
  }

  isInSegment(name: string): boolean {
    return this.segmentCache[name] === true;
  }

  /**
   * Reset (update) the cached list of segments with the given list, removing and adding segments if necessary.
   * @NOTE based on the way we use segments in the browser, this way is the best option
   *
   * @param {string[]} names list of segment names
   * @returns boolean indicating if the cache was updated (i.e., given list was different from the cached one)
   */
  resetSegments(names: string[]): boolean {
    let isDiff = false;
    let index;

    const storedSegmentKeys = Object.keys(this.segmentCache);

    // Extreme fast => everything is empty
    if (names.length === 0 && storedSegmentKeys.length === names.length)
      return isDiff;

    // Quick path
    if (storedSegmentKeys.length !== names.length) {
      isDiff = true;

      this.segmentCache = {};
      names.forEach(s => {
        this.addToSegment(s);
      });
    } else {
      // Slowest path => we need to find at least 1 difference because
      for (index = 0; index < names.length && this.isInSegment(names[index]); index++) {
        // TODO: why empty statement?
      }

      if (index < names.length) {
        isDiff = true;

        this.segmentCache = {};
        names.forEach(s => {
          this.addToSegment(s);
        });
      }
    }

    return isDiff;
  }

  getRegisteredSegments() {
    return Object.keys(this.segmentCache);
  }

  getKeysCount() {
    return 1;
  }

}
