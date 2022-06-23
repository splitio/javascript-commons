import { ISegmentsCacheSync } from '../../../storages/types';
import { Backoff } from '../../../utils/Backoff';
import { ISegmentsSyncTask } from '../../polling/types';
import { ISegmentUpdateData } from '../SSEHandler/types';
import { IUpdateWorker } from './types';

/**
 * SegmentUpdateWorker class
 */
export class SegmentsUpdateWorker implements IUpdateWorker {

  private readonly segmentsCache: ISegmentsCacheSync;
  private readonly segmentsSyncTask: ISegmentsSyncTask;
  private readonly maxChangeNumbers: Record<string, number>;
  private handleNewEvent: boolean;
  readonly backoff: Backoff;

  /**
   * @param {Object} segmentsCache segments data cache
   * @param {Object} segmentsSyncTask task for syncing segments data
   */
  constructor(segmentsSyncTask: ISegmentsSyncTask, segmentsCache: ISegmentsCacheSync) {
    this.segmentsCache = segmentsCache;
    this.segmentsSyncTask = segmentsSyncTask;
    this.maxChangeNumbers = {};
    this.handleNewEvent = false;
    this.put = this.put.bind(this);
    this.__handleSegmentUpdateCall = this.__handleSegmentUpdateCall.bind(this);
    this.backoff = new Backoff(this.__handleSegmentUpdateCall);
  }

  // Private method
  // Precondition: this.segmentsSyncTask.isSynchronizingSegments === false
  // Approach similar to MySegmentsUpdateWorker due to differences on Segments notifications and endpoint changeNumbers
  __handleSegmentUpdateCall() {
    const segmentsToFetch = Object.keys(this.maxChangeNumbers).filter((segmentName) => {
      return this.maxChangeNumbers[segmentName] > this.segmentsCache.getChangeNumber(segmentName);
    });
    if (segmentsToFetch.length > 0) {
      this.handleNewEvent = false;
      const currentMaxChangeNumbers = segmentsToFetch.map(segmentToFetch => this.maxChangeNumbers[segmentToFetch]);

      // fetch segments revalidating data if cached
      this.segmentsSyncTask.execute(segmentsToFetch, true).then((result) => {
        // Unlike `SplitUpdateWorker` where changeNumber is consistent between notification and endpoint, if there is no error,
        // we must clean the `maxChangeNumbers` of those segments that didn't receive a new update notification during the fetch.
        if (result !== false) {
          segmentsToFetch.forEach((fetchedSegment, index) => {
            if (this.maxChangeNumbers[fetchedSegment] === currentMaxChangeNumbers[index]) this.maxChangeNumbers[fetchedSegment] = -1;
          });
        } else {
          // recursive invocation with backoff if there was some error
          this.backoff.scheduleCall();
        }

        // immediate recursive invocation if a new notification was queued during fetch
        if (this.handleNewEvent) {
          this.__handleSegmentUpdateCall();
        }
      });
    }
  }

  /**
   * Invoked by NotificationProcessor on SEGMENT_UPDATE event
   *
   * @param {number} changeNumber change number of the SEGMENT_UPDATE notification
   * @param {string} segmentName segment name of the SEGMENT_UPDATE notification
   */
  put({ changeNumber, segmentName }: ISegmentUpdateData) {
    const currentChangeNumber = this.segmentsCache.getChangeNumber(segmentName);

    if (changeNumber <= currentChangeNumber || changeNumber <= this.maxChangeNumbers[segmentName]) return;

    this.maxChangeNumbers[segmentName] = changeNumber;
    this.handleNewEvent = true;
    this.backoff.reset();

    if (this.segmentsSyncTask.isExecuting()) return;

    this.__handleSegmentUpdateCall();
  }

}
