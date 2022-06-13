import { IImpressionsCacheSync } from '../types';
import { ImpressionDTO } from '../../types';

export class ImpressionsCacheInMemory implements IImpressionsCacheSync {

  private onFullQueue?: () => void;
  private readonly maxQueue: number;
  private queue: ImpressionDTO[];

  /**
   *
   * @param impressionsQueueSize number of queued impressions to call onFullQueueCb.
   * Default value is 0, that means no maximum value, in case we want to avoid this being triggered.
   */
  constructor(impressionsQueueSize: number = 0) {
    this.maxQueue = impressionsQueueSize;
    this.queue = [];
  }

  setOnFullQueueCb(cb: () => void) {
    this.onFullQueue = cb;
  }

  /**
   * Store impressions in sequential order
   */
  track(data: ImpressionDTO[]) {
    this.queue.push(...data);

    // Check if the cache queue is full and we need to flush it.
    if (this.maxQueue > 0 && this.queue.length >= this.maxQueue && this.onFullQueue) {
      this.onFullQueue();
    }
  }

  /**
   * Clear the data stored on the cache.
   */
  clear() {
    this.queue = [];
  }

  /**
   * Pop the collected data, used as payload for posting.
   */
  pop(toMerge?: ImpressionDTO[]) {
    const data = this.queue;
    this.clear();
    return toMerge ? toMerge.concat(data) : data;
  }

  /**
   * Check if the cache is empty.
   */
  isEmpty() {
    return this.queue.length === 0;
  }
}
