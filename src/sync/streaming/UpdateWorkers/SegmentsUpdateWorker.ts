import { ILogger } from '../../../logger/types';
import { ISegmentsCacheSync } from '../../../storages/types';
import { Backoff } from '../../../utils/Backoff';
import { ISegmentsSyncTask } from '../../polling/types';
import { ISegmentUpdateData } from '../SSEHandler/types';
import { FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_RETRIES, FETCH_BACKOFF_MAX_WAIT } from './constants';
import { IUpdateWorker } from './types';

/**
 * SegmentUpdateWorker class
 */
export class SegmentsUpdateWorker implements IUpdateWorker {

  private readonly log: ILogger;
  private readonly segmentsCache: ISegmentsCacheSync;
  private readonly segmentsSyncTask: ISegmentsSyncTask;
  private readonly maxChangeNumbers: Record<string, number>;
  private handleNewEvent: boolean;
  private cdnBypass?: boolean;
  readonly backoff: Backoff;

  /**
   * @param {Object} segmentsCache segments data cache
   * @param {Object} segmentsSyncTask task for syncing segments data
   */
  constructor(log: ILogger, segmentsSyncTask: ISegmentsSyncTask, segmentsCache: ISegmentsCacheSync) {
    this.log = log;
    this.segmentsCache = segmentsCache;
    this.segmentsSyncTask = segmentsSyncTask;
    this.maxChangeNumbers = {};
    this.handleNewEvent = false;
    this.put = this.put.bind(this);
    this.__handleSegmentUpdateCall = this.__handleSegmentUpdateCall.bind(this);
    this.backoff = new Backoff(this.__handleSegmentUpdateCall, FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT);
  }

  // Returns list of segments which expected change number is higher than stored one
  __segmentsToFetch() {
    return Object.keys(this.maxChangeNumbers).filter((segmentName) => {
      return this.maxChangeNumbers[segmentName] > this.segmentsCache.getChangeNumber(segmentName);
    });
  }

  // Private method
  // Precondition: this.segmentsSyncTask.isSynchronizingSegments === false
  // Approach similar to MySegmentsUpdateWorker due to differences on Segments notifications and endpoint changeNumbers
  __handleSegmentUpdateCall() {
    let segmentsToFetch = this.__segmentsToFetch();
    if (segmentsToFetch.length > 0) {
      this.handleNewEvent = false;

      // fetch segments revalidating data if cached
      this.segmentsSyncTask.execute(
        segmentsToFetch, true, false,
        this.cdnBypass ? segmentsToFetch.map(name => this.maxChangeNumbers[name]) : undefined // tills
      ).then(() => {
        if (this.handleNewEvent) {
          this.__handleSegmentUpdateCall();
        } else {
          const attemps = this.backoff.attempts + 1;

          segmentsToFetch = this.__segmentsToFetch();
          if (segmentsToFetch.length === 0) {
            this.log.debug(`Refresh completed${this.cdnBypass ? ' bypassing the CDN' : ''} in ${attemps} attempts.`);
            return;
          }

          if (attemps < FETCH_BACKOFF_MAX_RETRIES) {
            this.backoff.scheduleCall();
            return;
          }

          if (this.cdnBypass) {
            this.log.debug(`No changes fetched after ${attemps} attempts with CDN bypassed.`);
          } else {
            this.backoff.reset();
            this.cdnBypass = true;
            this.__handleSegmentUpdateCall();
          }
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
    this.cdnBypass = false;

    if (this.segmentsSyncTask.isExecuting()) return;

    this.__handleSegmentUpdateCall();
  }

}
