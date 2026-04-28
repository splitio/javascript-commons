import { IRBSegment, IDefinition } from '../../../dtos/types';
import { STREAMING_PARSING_SPLIT_UPDATE } from '../../../logger/constants';
import { ILogger } from '../../../logger/types';
import { SDK_DEFINITIONS_ARRIVED } from '../../../readiness/constants';
import { IDefinitionsEventEmitter } from '../../../readiness/types';
import { IRBSegmentsCacheSync, IDefinitionsCacheSync, IStorageSync } from '../../../storages/types';
import { ITelemetryTracker } from '../../../trackers/types';
import { Backoff } from '../../../utils/Backoff';
import { SPLITS } from '../../../utils/constants';
import { ISegmentsSyncTask, IDefinitionsSyncTask } from '../../polling/types';
import { InstantUpdate } from '../../polling/updaters/definitionChangesUpdater';
import { RB_SEGMENT_UPDATE } from '../constants';
import { parseFFUpdatePayload } from '../parseUtils';
import { ISplitKillData, ISplitUpdateData } from '../SSEHandler/types';
import { FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT, FETCH_BACKOFF_MAX_RETRIES } from './constants';
import { IUpdateWorker } from './types';

/**
 * DefinitionsUpdateWorker factory
 */
export function DefinitionsUpdateWorker(log: ILogger, storage: IStorageSync, definitionsSyncTask: IDefinitionsSyncTask, definitionsEventEmitter: IDefinitionsEventEmitter, telemetryTracker: ITelemetryTracker, segmentsSyncTask?: ISegmentsSyncTask): IUpdateWorker<[updateData: ISplitUpdateData]> & { killDefinition(event: ISplitKillData): void } {

  const ff = DefinitionsUpdateWorker(storage.definitions);
  const rbs = DefinitionsUpdateWorker(storage.rbSegments);

  function DefinitionsUpdateWorker(cache: IDefinitionsCacheSync | IRBSegmentsCacheSync) {
    let maxChangeNumber = -1;
    let handleNewEvent = false;
    let isHandlingEvent: boolean;
    let cdnBypass: boolean;
    let instantUpdate: InstantUpdate | undefined;
    const backoff = new Backoff(__handleDefinitionUpdateCall, FETCH_BACKOFF_BASE, FETCH_BACKOFF_MAX_WAIT);

    function __handleDefinitionUpdateCall() {
      isHandlingEvent = true;
      if (maxChangeNumber > cache.getChangeNumber()) {
        handleNewEvent = false;
        // fetch splits revalidating data if cached
        definitionsSyncTask.execute(true, cdnBypass ? maxChangeNumber : undefined, instantUpdate).then(() => {
          if (!isHandlingEvent) return; // halt if `stop` has been called
          if (handleNewEvent) {
            __handleDefinitionUpdateCall();
          } else {
            if (instantUpdate) telemetryTracker.trackUpdatesFromSSE(SPLITS);
            // fetch new registered segments for server-side API. Not retrying on error
            if (segmentsSyncTask) segmentsSyncTask.execute(true);

            const attempts = backoff.attempts + 1;

            if (ff.isSync() && rbs.isSync()) {
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
              __handleDefinitionUpdateCall();
            }
          }
        });
      } else {
        isHandlingEvent = false;
      }
    }

    return {
      /**
       * Invoked by NotificationProcessor on SPLIT_UPDATE or RB_SEGMENT_UPDATE event
       *
       * @param changeNumber - change number of the notification
       */
      put({ changeNumber, pcn, type }: ISplitUpdateData, payload?: IDefinition | IRBSegment) {
        const currentChangeNumber = cache.getChangeNumber();

        if (changeNumber <= currentChangeNumber || changeNumber <= maxChangeNumber) return;

        maxChangeNumber = changeNumber;
        handleNewEvent = true;
        cdnBypass = false;
        instantUpdate = undefined;

        if (payload && currentChangeNumber === pcn) {
          instantUpdate = { payload, changeNumber, type };
        }

        if (backoff.timeoutID || !isHandlingEvent) __handleDefinitionUpdateCall();
        backoff.reset();
      },
      stop() {
        isHandlingEvent = false;
        backoff.reset();
      },
      isSync() {
        return maxChangeNumber <= cache.getChangeNumber();
      }
    };
  }

  return {
    put(parsedData) {
      if (parsedData.d && parsedData.c !== undefined) {
        try {
          const payload = parseFFUpdatePayload(parsedData.c, parsedData.d);
          if (payload) {
            (parsedData.type === RB_SEGMENT_UPDATE ? rbs : ff).put(parsedData, payload);
            return;
          }
        } catch (e) {
          log.warn(STREAMING_PARSING_SPLIT_UPDATE, [parsedData.type, e]);
        }
      }
      (parsedData.type === RB_SEGMENT_UPDATE ? rbs : ff).put(parsedData);
    },
    /**
     * Invoked by NotificationProcessor on SPLIT_KILL event
     *
     * @param changeNumber - change number of the notification
     * @param splitName - name of split to kill
     * @param defaultTreatment - default treatment value
     */
    killDefinition({ changeNumber, splitName, defaultTreatment }: ISplitKillData) {
      if (storage.definitions.killLocally(splitName, defaultTreatment, changeNumber)) {
        // trigger an SDK_UPDATE if Split was killed locally
        definitionsEventEmitter.emit(SDK_DEFINITIONS_ARRIVED, true);
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
