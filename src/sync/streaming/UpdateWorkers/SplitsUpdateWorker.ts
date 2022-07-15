import { ILogger } from '../../../logger/types';
import { SDK_SPLITS_ARRIVED } from '../../../readiness/constants';
import { ISplitsEventEmitter } from '../../../readiness/types';
import { ISplitsCacheSync } from '../../../storages/types';
import { Backoff } from '../../../utils/Backoff';
import { ISegmentsSyncTask, ISplitsSyncTask } from '../../polling/types';
import { ISplitKillData, ISplitUpdateData } from '../SSEHandler/types';
import { FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT, FETCH_BACKOFF_MAX_RETRIES } from './constants';
import { IUpdateWorker } from './types';

/**
 * SplitsUpdateWorker class
 */
export class SplitsUpdateWorker implements IUpdateWorker {

  private readonly log: ILogger;
  private readonly splitsCache: ISplitsCacheSync;
  private readonly splitsSyncTask: ISplitsSyncTask;
  private readonly splitsEventEmitter: ISplitsEventEmitter;
  private readonly segmentsSyncTask?: ISegmentsSyncTask;
  private maxChangeNumber: number;
  private handleNewEvent: boolean;
  private cdnBypass?: boolean;
  readonly backoff: Backoff;

  /**
   * @param {Object} splitsCache splits data cache
   * @param {Object} splitsSyncTask task for syncing splits data
   * @param {Object} splitsEventEmitter emitter for splits data events
   */
  constructor(log: ILogger, splitsCache: ISplitsCacheSync, splitsSyncTask: ISplitsSyncTask, splitsEventEmitter: ISplitsEventEmitter, segmentsSyncTask?: ISegmentsSyncTask) {
    this.log = log;
    this.splitsCache = splitsCache;
    this.splitsSyncTask = splitsSyncTask;
    this.splitsEventEmitter = splitsEventEmitter;
    this.segmentsSyncTask = segmentsSyncTask;
    this.maxChangeNumber = 0;
    this.handleNewEvent = false;
    this.put = this.put.bind(this);
    this.killSplit = this.killSplit.bind(this);
    this.__handleSplitUpdateCall = this.__handleSplitUpdateCall.bind(this);
    this.backoff = new Backoff(this.__handleSplitUpdateCall, FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT);
  }

  // Private method
  // Preconditions: this.splitsSyncTask.isSynchronizingSplits === false
  __handleSplitUpdateCall() {
    if (this.maxChangeNumber > this.splitsCache.getChangeNumber()) {
      this.handleNewEvent = false;

      // fetch splits revalidating data if cached
      this.splitsSyncTask.execute(true, this.cdnBypass ? this.maxChangeNumber : undefined).then(() => {
        if (this.handleNewEvent) {
          this.__handleSplitUpdateCall();
        } else {
          // fetch new registered segments for server-side API. Not retrying on error
          if (this.segmentsSyncTask) this.segmentsSyncTask.execute(true);

          const attemps = this.backoff.attempts + 1;

          if (this.maxChangeNumber <= this.splitsCache.getChangeNumber()) {
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
            this.__handleSplitUpdateCall();
          }
        }
      });
    }
  }

  /**
   * Invoked by NotificationProcessor on SPLIT_UPDATE event
   *
   * @param {number} changeNumber change number of the SPLIT_UPDATE notification
   */
  put({ changeNumber }: Pick<ISplitUpdateData, 'changeNumber'>) {
    const currentChangeNumber = this.splitsCache.getChangeNumber();

    if (changeNumber <= currentChangeNumber || changeNumber <= this.maxChangeNumber) return;

    this.maxChangeNumber = changeNumber;
    this.handleNewEvent = true;
    this.backoff.reset();
    this.cdnBypass = false;

    if (this.splitsSyncTask.isExecuting()) return;

    this.__handleSplitUpdateCall();
  }

  /**
   * Invoked by NotificationProcessor on SPLIT_KILL event
   *
   * @param {number} changeNumber change number of the SPLIT_UPDATE notification
   * @param {string} splitName name of split to kill
   * @param {string} defaultTreatment default treatment value
   */
  killSplit({ changeNumber, splitName, defaultTreatment }: ISplitKillData) {
    if (this.splitsCache.killLocally(splitName, defaultTreatment, changeNumber)) {
      // trigger an SDK_UPDATE if Split was killed locally
      this.splitsEventEmitter.emit(SDK_SPLITS_ARRIVED, true);
    }
    // queues the SplitChanges fetch (only if changeNumber is newer)
    this.put({ changeNumber });
  }

  stop() {
    this.backoff.reset();
  }

}
