import { ILogger } from '../../../logger/types';
import { ISegmentsCacheSync } from '../../../storages/types';
import { Backoff } from '../../../utils/Backoff';
import { ISegmentsSyncTask } from '../../polling/types';
import { ISegmentUpdateData } from '../SSEHandler/types';
import { FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_RETRIES, FETCH_BACKOFF_MAX_WAIT } from './constants';
import { IUpdateWorker } from './types';

/**
 * SegmentsUpdateWorker factory
 */
export function SegmentsUpdateWorker(log: ILogger, segmentsSyncTask: ISegmentsSyncTask, segmentsCache: ISegmentsCacheSync): IUpdateWorker {

  // Handles retries with CDN bypass per segment name
  function SegmentUpdateWorker(segment: string) {
    let maxChangeNumber = 0;
    let handleNewEvent = false;
    let isHandlingEvent: boolean;
    let cdnBypass: boolean;
    const backoff = new Backoff(__handleSegmentUpdateCall, FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT);

    function __handleSegmentUpdateCall() {
      isHandlingEvent = true;
      if (maxChangeNumber > segmentsCache.getChangeNumber(segment)) {
        handleNewEvent = false;

        // fetch segments revalidating data if cached
        segmentsSyncTask.execute(false, segment, true, cdnBypass ? maxChangeNumber : undefined).then(() => {
          if (!isHandlingEvent) return; // halt if `stop` has been called
          if (handleNewEvent) {
            __handleSegmentUpdateCall();
          } else {
            const attempts = backoff.attempts + 1;

            if (maxChangeNumber <= segmentsCache.getChangeNumber(segment)) {
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
              __handleSegmentUpdateCall();
            }
          }
        });
      } else {
        isHandlingEvent = false;
      }
    }

    return {
      put(changeNumber: number) {
        const currentChangeNumber = segmentsCache.getChangeNumber(segment);

        if (changeNumber <= currentChangeNumber || changeNumber <= maxChangeNumber) return;

        maxChangeNumber = changeNumber;
        handleNewEvent = true;
        cdnBypass = false;

        if (backoff.timeoutID || !isHandlingEvent) __handleSegmentUpdateCall();
        backoff.reset();
      },
      stop() {
        isHandlingEvent = false;
        backoff.reset();
      }
    };
  }

  const segments: Record<string, ReturnType<typeof SegmentUpdateWorker>> = {};

  return {
    /**
     * Invoked by NotificationProcessor on SEGMENT_UPDATE event
     *
     * @param {number} changeNumber change number of the SEGMENT_UPDATE notification
     * @param {string} segmentName segment name of the SEGMENT_UPDATE notification
     */
    put({ changeNumber, segmentName }: ISegmentUpdateData) {
      if (!segments[segmentName]) segments[segmentName] = SegmentUpdateWorker(segmentName);
      segments[segmentName].put(changeNumber);
    },

    stop() {
      Object.keys(segments).forEach(segmentName => segments[segmentName].stop());
    }
  };
}
