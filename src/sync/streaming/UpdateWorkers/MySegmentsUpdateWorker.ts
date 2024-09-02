import { IMySegmentsSyncTask, MySegmentsData } from '../../polling/types';
import { Backoff } from '../../../utils/Backoff';
import { IUpdateWorker } from './types';
import { ITelemetryTracker } from '../../../trackers/types';
import { MEMBERSHIPS } from '../../../utils/constants';
import { ISegmentsCacheSync, IStorageSync } from '../../../storages/types';
import { ILogger } from '../../../logger/types';
import { FETCH_BACKOFF_MAX_RETRIES } from './constants';
import { MEMBERSHIP_LS_UPDATE, MEMBERSHIP_MS_UPDATE } from '../constants';

/**
 * MySegmentsUpdateWorker factory
 */
export function MySegmentsUpdateWorker(log: ILogger, storage: Pick<IStorageSync, 'segments' | 'largeSegments'>, mySegmentsSyncTask: IMySegmentsSyncTask, telemetryTracker: ITelemetryTracker): IUpdateWorker<[mySegmentsData?: Pick<MySegmentsData, 'type' | 'cn'>, payload?: Pick<MySegmentsData, 'added' | 'removed'>, delay?: number]> {

  function createUpdateWorker(mySegmentsCache: ISegmentsCacheSync) {

    let maxChangeNumber = 0; // keeps the maximum changeNumber among queued events
    let currentChangeNumber = -1;
    let handleNewEvent = false;
    let isHandlingEvent: boolean;
    let cdnBypass: boolean;
    let _segmentsData: MySegmentsData | undefined; // keeps the segmentsData (if included in notification payload) from the queued event with maximum changeNumber
    let _delay: undefined | number;
    let _delayTimeoutID: any;
    const backoff = new Backoff(__handleMySegmentsUpdateCall);

    function __handleMySegmentsUpdateCall() {
      isHandlingEvent = true;
      if (maxChangeNumber > Math.max(currentChangeNumber, mySegmentsCache.getChangeNumber())) {
        handleNewEvent = false;
        const currentMaxChangeNumber = maxChangeNumber;

        // fetch mySegments revalidating data if cached
        const syncTask = _delay ?
          new Promise(res => {
            _delayTimeoutID = setTimeout(() => {
              _delay = undefined;
              mySegmentsSyncTask.execute(_segmentsData, true, cdnBypass ? maxChangeNumber : undefined).then(res);
            }, _delay);
          }) :
          mySegmentsSyncTask.execute(_segmentsData, true, cdnBypass ? maxChangeNumber : undefined);

        syncTask.then((result) => {
          if (!isHandlingEvent) return; // halt if `stop` has been called
          if (result !== false) { // Unlike `Splits|SegmentsUpdateWorker`, `mySegmentsCache.getChangeNumber` can be -1, since `/memberships` change number is optional
            const storageChangeNumber = mySegmentsCache.getChangeNumber();
            currentChangeNumber = storageChangeNumber > -1 ?
              storageChangeNumber :
              Math.max(currentChangeNumber, currentMaxChangeNumber); // use `currentMaxChangeNumber`, in case that `maxChangeNumber` was updated during fetch.
          }
          if (handleNewEvent) {
            __handleMySegmentsUpdateCall();
          } else {
            if (_segmentsData) telemetryTracker.trackUpdatesFromSSE(MEMBERSHIPS);

            const attempts = backoff.attempts + 1;

            if (maxChangeNumber <= currentChangeNumber) {
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
              __handleMySegmentsUpdateCall();
            }
          }
        });
      } else {
        isHandlingEvent = false;
      }
    }

    return {
      /**
       * Invoked by NotificationProcessor on MY_(LARGE)_SEGMENTS_UPDATE notifications
       *
       * @param changeNumber change number of the notification
       * @param segmentsData data for KeyList or SegmentRemoval instant updates
       * @param delay optional time to wait for BoundedFetchRequest or BoundedFetchRequest updates
       */
      put(mySegmentsData: Pick<MySegmentsData, 'type' | 'cn'>, payload?: Pick<MySegmentsData, 'added' | 'removed'>, delay?: number) {
        const { type, cn } = mySegmentsData;
        // Ignore event if it is outdated or if there is a pending fetch request (_delay is set)
        if (cn <= Math.max(currentChangeNumber, mySegmentsCache.getChangeNumber()) || cn <= maxChangeNumber || _delay) return;

        maxChangeNumber = cn;
        handleNewEvent = true;
        cdnBypass = false;
        _segmentsData = payload && { type, cn, added: payload.added, removed: payload.removed };
        _delay = delay;

        if (backoff.timeoutID || !isHandlingEvent) __handleMySegmentsUpdateCall();
        backoff.reset();
      },

      stop() {
        clearTimeout(_delayTimeoutID);
        _delay = undefined;
        isHandlingEvent = false;
        backoff.reset();
      }
    };
  }

  const updateWorkers = {
    [MEMBERSHIP_MS_UPDATE]: createUpdateWorker(storage.segments),
    [MEMBERSHIP_LS_UPDATE]: createUpdateWorker(storage.largeSegments!),
  };

  return {
    put(mySegmentsData: Pick<MySegmentsData, 'type' | 'cn'>, payload?: Pick<MySegmentsData, 'added' | 'removed'>, delay?: number) {
      updateWorkers[mySegmentsData.type].put(mySegmentsData, payload, delay);
    },
    stop() {
      updateWorkers[MEMBERSHIP_MS_UPDATE].stop();
      updateWorkers[MEMBERSHIP_LS_UPDATE].stop();
    }
  };
}
