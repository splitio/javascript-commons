import { IRBSegment, ISplit } from '../../../dtos/types';
import { STREAMING_PARSING_SPLIT_UPDATE } from '../../../logger/constants';
import { ILogger } from '../../../logger/types';
import { SDK_SPLITS_ARRIVED } from '../../../readiness/constants';
import { ISplitsEventEmitter } from '../../../readiness/types';
import { ISplitsCacheSync } from '../../../storages/types';
import { ITelemetryTracker } from '../../../trackers/types';
import { Backoff } from '../../../utils/Backoff';
import { SPLITS } from '../../../utils/constants';
import { ISegmentsSyncTask, ISplitsSyncTask } from '../../polling/types';
import { RBSEGMENT_UPDATE } from '../constants';
import { parseFFUpdatePayload } from '../parseUtils';
import { ISplitKillData, ISplitUpdateData } from '../SSEHandler/types';
import { FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT, FETCH_BACKOFF_MAX_RETRIES } from './constants';
import { IUpdateWorker } from './types';

/**
 * SplitsUpdateWorker factory
 */
export function SplitsUpdateWorker(log: ILogger, splitsCache: ISplitsCacheSync, splitsSyncTask: ISplitsSyncTask, splitsEventEmitter: ISplitsEventEmitter, telemetryTracker: ITelemetryTracker, segmentsSyncTask?: ISegmentsSyncTask): IUpdateWorker<[updateData: ISplitUpdateData]> & { killSplit(event: ISplitKillData): void } {

  function SplitsUpdateWorker() {
    let maxChangeNumber = 0;
    let handleNewEvent = false;
    let isHandlingEvent: boolean;
    let cdnBypass: boolean;
    let payload: ISplit | IRBSegment | undefined;
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

    return {
      /**
       * Invoked by NotificationProcessor on SPLIT_UPDATE or RBSEGMENT_UPDATE event
       *
       * @param changeNumber - change number of the notification
       */
      put({ changeNumber, pcn }: ISplitUpdateData, _payload?: ISplit | IRBSegment) {
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
      },
      stop() {
        isHandlingEvent = false;
        backoff.reset();
      }
    };
  }

  const ff = SplitsUpdateWorker();
  const rbs = SplitsUpdateWorker();

  return {
    put(parsedData) {
      if (parsedData.d && parsedData.c !== undefined) {
        try {
          const payload = parseFFUpdatePayload(parsedData.c, parsedData.d);
          if (payload) {
            (parsedData.type === RBSEGMENT_UPDATE ? rbs : ff).put(parsedData, payload);
            return;
          }
        } catch (e) {
          log.warn(STREAMING_PARSING_SPLIT_UPDATE, [parsedData.type, e]);
        }
      }
      (parsedData.type === RBSEGMENT_UPDATE ? rbs : ff).put(parsedData);
    },
    /**
     * Invoked by NotificationProcessor on SPLIT_KILL event
     *
     * @param changeNumber - change number of the notification
     * @param splitName - name of split to kill
     * @param defaultTreatment - default treatment value
     */
    killSplit({ changeNumber, splitName, defaultTreatment }: ISplitKillData) {
      if (splitsCache.killLocally(splitName, defaultTreatment, changeNumber)) {
        // trigger an SDK_UPDATE if Split was killed locally
        splitsEventEmitter.emit(SDK_SPLITS_ARRIVED, true);
      }
      // queues the SplitChanges fetch (only if changeNumber is newer)
      ff.put({ changeNumber } as ISplitUpdateData);
    },

    stop() {
      ff.stop();
      rbs.stop();
    }
  };
}
