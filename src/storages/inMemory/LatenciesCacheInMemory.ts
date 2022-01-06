import { ILatenciesCacheSync } from '../types';
import { findLatencyIndex } from '../findLatencyIndex';

export class LatenciesCacheInMemory implements ILatenciesCacheSync {

  private counters: Record<string, number[]> = {};

  /**
   * Add latencies.
   */
  track(metricName: string, latency: number) {
    // Initialize if needed
    if (this.counters[metricName] === undefined) {
      this.counters[metricName] = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ];
    }

    // +1 based on the latency number
    this.counters[metricName][findLatencyIndex(latency)]++;

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
