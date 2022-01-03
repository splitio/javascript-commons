import { ISegmentsSyncTask } from '../../polling/types';
import { Backoff } from '../../../utils/Backoff';
import { IUpdateWorker } from './types';
import { SegmentsData } from '../SSEHandler/types';

/**
 * MySegmentsUpdateWorker class
 */
export class MySegmentsUpdateWorker implements IUpdateWorker {

  private readonly mySegmentsSyncTask: ISegmentsSyncTask;
  private maxChangeNumber: number;
  private handleNewEvent: boolean;
  private segmentsData?: SegmentsData;
  private currentChangeNumber: number;
  readonly backoff: Backoff;

  /**
   * @param {Object} mySegmentsSyncTask task for syncing mySegments data
   */
  constructor(mySegmentsSyncTask: ISegmentsSyncTask) {
    this.mySegmentsSyncTask = mySegmentsSyncTask;
    this.maxChangeNumber = 0; // keeps the maximum changeNumber among queued events
    this.handleNewEvent = false;
    this.segmentsData = undefined; // keeps the segmentsData (if included in notification payload) from the queued event with maximum changeNumber
    this.currentChangeNumber = -1; // @TODO: remove once `/mySegments` endpoint provides the changeNumber
    this.put = this.put.bind(this);
    this.__handleMySegmentsUpdateCall = this.__handleMySegmentsUpdateCall.bind(this);
    this.backoff = new Backoff(this.__handleMySegmentsUpdateCall);
  }

  // Private method
  // Precondition: this.mySegmentsSyncTask.isSynchronizingMySegments === false
  __handleMySegmentsUpdateCall() {
    if (this.maxChangeNumber > this.currentChangeNumber) {
      this.handleNewEvent = false;
      const currentMaxChangeNumber = this.maxChangeNumber;

      // fetch mySegments revalidating data if cached
      this.mySegmentsSyncTask.execute(this.segmentsData, true).then((result) => {
        if (result !== false) // Unlike `Splits|SegmentsUpdateWorker`, we cannot use `mySegmentsCache.getChangeNumber` since `/mySegments` endpoint doesn't provide this value.
          this.currentChangeNumber = Math.max(this.currentChangeNumber, currentMaxChangeNumber); // use `currentMaxChangeNumber`, in case that `this.maxChangeNumber` was updated during fetch.
        if (this.handleNewEvent) {
          this.__handleMySegmentsUpdateCall();
        } else {
          this.backoff.scheduleCall();
        }
      });
    }
  }

  /**
   * Invoked by NotificationProcessor on MY_SEGMENTS_UPDATE event
   *
   * @param {number} changeNumber change number of the MY_SEGMENTS_UPDATE notification
   * @param {SegmentsData | undefined} segmentsData might be undefined
   */
  put(changeNumber: number, segmentsData?: SegmentsData) {
    if (changeNumber <= this.currentChangeNumber || changeNumber <= this.maxChangeNumber) return;

    this.maxChangeNumber = changeNumber;
    this.handleNewEvent = true;
    this.backoff.reset();
    this.segmentsData = segmentsData;

    if (this.mySegmentsSyncTask.isExecuting()) return;

    this.__handleMySegmentsUpdateCall();
  }

}
