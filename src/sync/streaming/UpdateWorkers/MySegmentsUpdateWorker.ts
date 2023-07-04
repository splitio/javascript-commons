import { IMySegmentsSyncTask, MySegmentsData } from '../../polling/types';
import { Backoff } from '../../../utils/Backoff';
import { IUpdateWorker } from './types';
import { MY_SEGMENT } from '../../../utils/constants';
import { ITelemetryTracker } from '../../../trackers/types';

/**
 * MySegmentsUpdateWorker factory
 */
export function MySegmentsUpdateWorker(mySegmentsSyncTask: IMySegmentsSyncTask, telemetryTracker: ITelemetryTracker): IUpdateWorker {

  let maxChangeNumber = 0; // keeps the maximum changeNumber among queued events
  let currentChangeNumber = -1;
  let handleNewEvent = false;
  let isHandlingEvent: boolean;
  let _segmentsData: MySegmentsData | undefined; // keeps the segmentsData (if included in notification payload) from the queued event with maximum changeNumber
  const backoff = new Backoff(__handleMySegmentsUpdateCall);

  function __handleMySegmentsUpdateCall() {
    isHandlingEvent = true;
    if (maxChangeNumber > currentChangeNumber) {
      handleNewEvent = false;
      const currentMaxChangeNumber = maxChangeNumber;

      // fetch mySegments revalidating data if cached
      mySegmentsSyncTask.execute(_segmentsData, true).then((result) => {
        if (!isHandlingEvent) return; // halt if `stop` has been called
        if (result !== false) {// Unlike `Splits|SegmentsUpdateWorker`, we cannot use `mySegmentsCache.getChangeNumber` since `/mySegments` endpoint doesn't provide this value.
          if (_segmentsData) telemetryTracker.trackUpdatesFromSSE(MY_SEGMENT);
          currentChangeNumber = Math.max(currentChangeNumber, currentMaxChangeNumber); // use `currentMaxChangeNumber`, in case that `maxChangeNumber` was updated during fetch.
        }
        if (handleNewEvent) {
          __handleMySegmentsUpdateCall();
        } else {
          backoff.scheduleCall();
        }
      });
    } else {
      isHandlingEvent = false;
    }
  }

  return {
    /**
     * Invoked by NotificationProcessor on MY_SEGMENTS_UPDATE event
     *
     * @param {number} changeNumber change number of the MY_SEGMENTS_UPDATE notification
     * @param {SegmentsData | undefined} segmentsData might be undefined
     */
    put(changeNumber: number, segmentsData?: MySegmentsData) {
      if (changeNumber <= currentChangeNumber || changeNumber <= maxChangeNumber) return;

      maxChangeNumber = changeNumber;
      handleNewEvent = true;
      _segmentsData = segmentsData;

      if (backoff.timeoutID || !isHandlingEvent) __handleMySegmentsUpdateCall();
      backoff.reset();
    },

    stop() {
      isHandlingEvent = false;
      backoff.reset();
    }
  };
}
