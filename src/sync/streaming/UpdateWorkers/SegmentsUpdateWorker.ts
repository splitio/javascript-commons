import { ILogger } from '../../../logger/types';
import { ISegmentsCacheSync } from '../../../storages/types';
import { Backoff } from '../../../utils/Backoff';
import { ISegmentsSyncTask } from '../../polling/types';
import { ISegmentUpdateData } from '../SSEHandler/types';
import { FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_RETRIES, FETCH_BACKOFF_MAX_WAIT } from './constants';
import { IUpdateWorker } from './types';

// Handles retries and CDN bypass per segment name
class SegmentUpdateWorker {

  private readonly log: ILogger;
  private readonly segmentsCache: ISegmentsCacheSync;
  private readonly segmentSyncTask: ReturnType<ISegmentsSyncTask['updateSegment']>;
  private readonly segment: string;
  private maxChangeNumber: number;
  private handleNewEvent: boolean;
  private cdnBypass?: boolean;
  readonly backoff: Backoff;

  constructor(log: ILogger, segmentSyncTask: ReturnType<ISegmentsSyncTask['updateSegment']>, segmentsCache: ISegmentsCacheSync, segment: string) {
    this.log = log;
    this.segmentsCache = segmentsCache;
    this.segmentSyncTask = segmentSyncTask;
    this.segment = segment;
    this.maxChangeNumber = 0;
    this.handleNewEvent = false;
    // this.put = this.put.bind(this);
    this.__handleSegmentUpdateCall = this.__handleSegmentUpdateCall.bind(this);
    this.backoff = new Backoff(this.__handleSegmentUpdateCall, FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT);
  }

  __handleSegmentUpdateCall() {
    if (this.maxChangeNumber > this.segmentsCache.getChangeNumber(this.segment)) {
      this.handleNewEvent = false;

      // fetch segments revalidating data if cached
      this.segmentSyncTask.execute(true, false, this.cdnBypass ? this.maxChangeNumber : undefined).then(() => {
        if (this.handleNewEvent) {
          this.__handleSegmentUpdateCall();
        } else {
          const attemps = this.backoff.attempts + 1;

          if (this.maxChangeNumber <= this.segmentsCache.getChangeNumber(this.segment)) {
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

  put(changeNumber: number) {
    const currentChangeNumber = this.segmentsCache.getChangeNumber(this.segment);

    if (changeNumber <= currentChangeNumber || changeNumber <= this.maxChangeNumber) return;

    this.maxChangeNumber = changeNumber;
    this.handleNewEvent = true;
    this.backoff.reset();
    this.cdnBypass = false;

    this.segmentSyncTask.whenDone().then(this.__handleSegmentUpdateCall);
  }

}

/**
 * SegmentUpdateWorker class
 */
export class SegmentsUpdateWorker implements IUpdateWorker {

  private readonly log: ILogger;
  private readonly segmentsCache: ISegmentsCacheSync;
  private readonly segmentsSyncTask: ISegmentsSyncTask;
  private readonly segments: Record<string, SegmentUpdateWorker>;

  /**
   * @param {Object} segmentsCache segments data cache
   * @param {Object} segmentsSyncTask task for syncing segments data
   */
  constructor(log: ILogger, segmentsSyncTask: ISegmentsSyncTask, segmentsCache: ISegmentsCacheSync) {
    this.log = log;
    this.segmentsSyncTask = segmentsSyncTask;
    this.segmentsCache = segmentsCache;
    this.segments = {};
    this.put = this.put.bind(this);
  }

  /**
   * Invoked by NotificationProcessor on SEGMENT_UPDATE event
   *
   * @param {number} changeNumber change number of the SEGMENT_UPDATE notification
   * @param {string} segmentName segment name of the SEGMENT_UPDATE notification
   */
  put({ changeNumber, segmentName }: ISegmentUpdateData) {
    if (!this.segments[segmentName]) this.segments[segmentName] = new SegmentUpdateWorker(this.log, this.segmentsSyncTask.updateSegment(segmentName), this.segmentsCache, segmentName);
    this.segments[segmentName].put(changeNumber);
  }

  reset() {
    Object.keys(this.segments).forEach(segmentName => this.segments[segmentName].backoff.reset());
  }

}
