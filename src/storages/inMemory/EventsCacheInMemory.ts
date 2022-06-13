import { SplitIO } from '../../types';
import { IEventsCacheSync } from '../types';

const MAX_QUEUE_BYTE_SIZE = 5 * 1024 * 1024; // 5M

export class EventsCacheInMemory implements IEventsCacheSync {

  private onFullQueue?: () => void;
  private readonly maxQueue: number;
  private queue: SplitIO.EventData[];
  private queueByteSize: number;

  /**
   *
   * @param eventsQueueSize number of queued events to call onFullQueueCb.
   * Default value is 0, that means no maximum value, in case we want to avoid this being triggered.
   */
  constructor(eventsQueueSize: number = 0) {
    this.maxQueue = eventsQueueSize;
    this.queue = [];
    this.queueByteSize = 0;
  }

  setOnFullQueueCb(cb: () => void) {
    this.onFullQueue = cb;
  }

  /**
   * Add a new event object at the end of the queue.
   */
  track(data: SplitIO.EventData, size = 0) {
    this.queueByteSize += size;
    this.queue.push(data);

    this._checkForFlush();

    return true;
  }

  /**
   * Clear the data stored on the cache.
   */
  clear() {
    this.queue = [];
    this.queueByteSize = 0;
  }

  /**
   * Pop the collected data, used as payload for posting.
   */
  pop(toMerge?: SplitIO.EventData[]) {
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

  /**
   * Check if the cache queue is full and we need to flush it.
   */
  private _checkForFlush() {
    if (
      (this.queueByteSize > MAX_QUEUE_BYTE_SIZE) ||
      // 0 means no maximum value, in case we want to avoid this being triggered. Size limit is not affected by it.
      (this.maxQueue > 0 && this.queue.length >= this.maxQueue)
    ) {
      this.onFullQueue && this.onFullQueue();
    }
  }
}
