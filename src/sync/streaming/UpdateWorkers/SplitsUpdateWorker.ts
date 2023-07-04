import { ISplit } from '../../../dtos/types';
import { ILogger } from '../../../logger/types';
import { SDK_SPLITS_ARRIVED } from '../../../readiness/constants';
import { ISplitsEventEmitter } from '../../../readiness/types';
import { ISplitsCacheSync } from '../../../storages/types';
import { ITelemetryTracker } from '../../../trackers/types';
import { Backoff } from '../../../utils/Backoff';
import { SPLITS } from '../../../utils/constants';
import { ISegmentsSyncTask, ISplitsSyncTask } from '../../polling/types';
import { ISplitKillData, ISplitUpdateData } from '../SSEHandler/types';
import { FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT, FETCH_BACKOFF_MAX_RETRIES } from './constants';
import { IUpdateWorker } from './types';

/**
 * SplitsUpdateWorker factory
 */
export function SplitsUpdateWorker(log: ILogger, splitsCache: ISplitsCacheSync, splitsSyncTask: ISplitsSyncTask, splitsEventEmitter: ISplitsEventEmitter, telemetryTracker: ITelemetryTracker, segmentsSyncTask?: ISegmentsSyncTask): IUpdateWorker & { killSplit(event: ISplitKillData): void } {

  let maxChangeNumber = 0;
  let handleNewEvent = false;
  let isHandlingEvent: boolean;
  let cdnBypass: boolean;
  let payload: ISplit | undefined;
  const backoff = new Backoff(__handleSplitUpdateCall, FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT);

  function __handleSplitUpdateCall() {
    isHandlingEvent = true;
    if (maxChangeNumber > splitsCache.getChangeNumber()) {
      handleNewEvent = false;
      const splitUpdateNotification = payload ? { payload, changeNumber: maxChangeNumber } : undefined;
      // fetch splits revalidating data if cached
      splitsSyncTask.execute(true, cdnBypass ? maxChangeNumber : undefined, splitUpdateNotification).then(() => {
        if (!isHandlingEvent) return; // halt if `stop` has been called
        if (handleNewEvent) {
          __handleSplitUpdateCall();
        } else {
          if (splitUpdateNotification) telemetryTracker.trackUpdatesFromSSE(SPLITS);
          // fetch new registered segments for server-side API. Not retrying on error
          if (segmentsSyncTask) segmentsSyncTask.execute(true);

          const attempts = backoff.attempts + 1;

          if (maxChangeNumber <= splitsCache.getChangeNumber()) {
            log.debug(`Refresh completed${cdnBypass ? ' bypassing the CDN' : ''} in ${attempts} attempts.`);
            isHandlingEvent = false;
            return;
          }

          if (attempts < FETCH_BACKOFF_MAX_RETRIES) {
            backoff.scheduleCall();
            return;
          }

          if (cdnBypass) {
            log.debug(`No changes fetched after ${attempts} attempts with CDN bypassed.`);
            isHandlingEvent = false;
          } else {
            backoff.reset();
            cdnBypass = true;
            __handleSplitUpdateCall();
          }
        }
      });
    } else {
      isHandlingEvent = false;
    }
  }

  /**
   * Invoked by NotificationProcessor on SPLIT_UPDATE event
   *
   * @param {number} changeNumber change number of the SPLIT_UPDATE notification
   */
  function put({ changeNumber, pcn }: ISplitUpdateData, _payload?: ISplit) {
    const currentChangeNumber = splitsCache.getChangeNumber();

    if (changeNumber <= currentChangeNumber || changeNumber <= maxChangeNumber) return;

    maxChangeNumber = changeNumber;
    handleNewEvent = true;
    cdnBypass = false;
    payload = undefined;

    if (_payload && currentChangeNumber === pcn) {
      payload = _payload;
    }

    if (backoff.timeoutID || !isHandlingEvent) __handleSplitUpdateCall();
    backoff.reset();
  }

  return {
    put,
    /**
     * Invoked by NotificationProcessor on SPLIT_KILL event
     *
     * @param {number} changeNumber change number of the SPLIT_UPDATE notification
     * @param {string} splitName name of split to kill
     * @param {string} defaultTreatment default treatment value
     */
    killSplit({ changeNumber, splitName, defaultTreatment }: ISplitKillData) {
      if (splitsCache.killLocally(splitName, defaultTreatment, changeNumber)) {
        // trigger an SDK_UPDATE if Split was killed locally
        splitsEventEmitter.emit(SDK_SPLITS_ARRIVED, true);
      }
      // queues the SplitChanges fetch (only if changeNumber is newer)
      put({ changeNumber } as ISplitUpdateData);
    },

    stop() {
      isHandlingEvent = false;
      backoff.reset();
    }
  };
}
