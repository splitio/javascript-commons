import { ICountsCacheSync } from '../types';

export class CountsCacheInMemory implements ICountsCacheSync {

  private counters: Record<string, number> = {};

  /**
   * Add counts.
   */
  track(metricName: string) {
    if (this.counters[metricName] === undefined) this.counters[metricName] = 1;
    else this.counters[metricName]++;

    return true;
  }

  /**
   * Clear the collector
   */
  clear() {
    this.counters = {};
  }

  /**
   * Get the collected data, used as payload for posting.
   */
  state() {
    return this.counters;
  }

  /**
   * Check if the cache is empty.
   */
  isEmpty() {
    return Object.keys(this.counters).length === 0;
  }
}
