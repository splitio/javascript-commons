import { ISplitsEventEmitter } from '../../../readiness/types';
import { ISplitsCacheSync } from '../../../storages/types';
import Backoff from '../../../utils/Backoff';
import { ISplitsSyncTask } from '../../polling/types';
import { IUpdateWorker } from './types';

/**
 * SplitsUpdateWorker class
 */
export default class SplitsUpdateWorker implements IUpdateWorker {

  private readonly splitsCache: ISplitsCacheSync;
  private readonly splitsSyncTask: ISplitsSyncTask;
  private maxChangeNumber: number;
  private handleNewEvent: boolean;
  private readonly splitsEventEmitter: ISplitsEventEmitter;
  readonly backoff: Backoff;

  /**
   * @param {Object} splitsCache splits data cache
   * @param {Object} splitsSyncTask task for syncing splits data
   * @param {Object} splitsEventEmitter emitter for splits data events
   */
  constructor(splitsCache: ISplitsCacheSync, splitsSyncTask: ISplitsSyncTask, splitsEventEmitter: ISplitsEventEmitter) {
    this.splitsCache = splitsCache;
    this.splitsSyncTask = splitsSyncTask;
    this.maxChangeNumber = 0;
    this.handleNewEvent = false;
    this.splitsEventEmitter = splitsEventEmitter;
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
      this.splitsSyncTask.execute().then(() => {
        if (this.handleNewEvent) {
          this.__handleSplitUpdateCall();
        } else {
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
  put(changeNumber: number) {
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
  killSplit(changeNumber: number, splitName: string, defaultTreatment: string) {
    // @TODO handle retry due to errors in storage, once we allow the definition of custom async storages
    if (this.splitsCache.killLocally(splitName, defaultTreatment, changeNumber)) {
      // trigger an SDK_UPDATE if Split was killed locally
      this.splitsEventEmitter.emit('SDK_SPLITS_ARRIVED', true);
    }
    // queues the SplitChanges fetch (only if changeNumber is newer)
    this.put(changeNumber);
  }

}
