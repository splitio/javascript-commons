import { SDK_SPLITS_ARRIVED } from '../../../readiness/constants';
import { ISplitsEventEmitter } from '../../../readiness/types';
import { ISplitsCacheSync } from '../../../storages/types';
import { Backoff } from '../../../utils/Backoff';
import { ISegmentsSyncTask, ISplitsSyncTask } from '../../polling/types';
import { ISplitKillData, ISplitUpdateData } from '../SSEHandler/types';
import { IUpdateWorker } from './types';

/**
 * SplitsUpdateWorker class
 */
export class SplitsUpdateWorker implements IUpdateWorker {

  private readonly splitsCache: ISplitsCacheSync;
  private readonly splitsSyncTask: ISplitsSyncTask;
  private readonly splitsEventEmitter: ISplitsEventEmitter;
  private readonly segmentsSyncTask?: ISegmentsSyncTask;
  private maxChangeNumber: number;
  private handleNewEvent: boolean;
  readonly backoff: Backoff;

  /**
   * @param {Object} splitsCache splits data cache
   * @param {Object} splitsSyncTask task for syncing splits data
   * @param {Object} splitsEventEmitter emitter for splits data events
   */
  constructor(splitsCache: ISplitsCacheSync, splitsSyncTask: ISplitsSyncTask, splitsEventEmitter: ISplitsEventEmitter, segmentsSyncTask?: ISegmentsSyncTask) {
    this.splitsCache = splitsCache;
    this.splitsSyncTask = splitsSyncTask;
    this.splitsEventEmitter = splitsEventEmitter;
    this.segmentsSyncTask = segmentsSyncTask;
    this.maxChangeNumber = 0;
    this.handleNewEvent = false;
    this.put = this.put.bind(this);
    this.killSplit = this.killSplit.bind(this);
    this.__handleSplitUpdateCall = this.__handleSplitUpdateCall.bind(this);
    this.backoff = new Backoff(this.__handleSplitUpdateCall);
  }

  // Private method
  // Preconditions: this.splitsSyncTask.isSynchronizingSplits === false
  __handleSplitUpdateCall() {
    if (this.maxChangeNumber > this.splitsCache.getChangeNumber()) {
      this.handleNewEvent = false;

      // fetch splits revalidating data if cached
      this.splitsSyncTask.execute(true).then(() => {
        if (this.handleNewEvent) {
          this.__handleSplitUpdateCall();
        } else {
          // fetch new registered segments for server-side API. Not retrying on error
          if (this.segmentsSyncTask) this.segmentsSyncTask.execute(undefined, false, true);
          this.backoff.scheduleCall();
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

}
