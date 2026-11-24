import { IMySegmentsSyncTask, IPollingManagerCS } from './types';
import { forOwn } from '../../utils/lang';
import { IReadinessManager } from '../../readiness/types';
import { IStorageSync } from '../../storages/types';
import { mySegmentsSyncTaskFactory } from './syncTasks/mySegmentsSyncTask';
import { definitionsSyncTaskFactory } from './syncTasks/definitionsSyncTask';
import { getMatching } from '../../utils/key';
import { SDK_DEFINITIONS_ARRIVED, SDK_SEGMENTS_ARRIVED } from '../../readiness/constants';
import { POLLING_SMART_PAUSING, POLLING_START, POLLING_STOP } from '../../logger/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { usesSegmentsSync } from '../../storages/AbstractDefinitionsCacheSync';
import { SdkUpdateMetadata } from '../../../types/splitio';
import { splitChangesFetcherFactory } from './fetchers/splitChangesFetcher';
import { Backoff } from '../../utils/Backoff';

/**
 * Expose start / stop mechanism for polling data from services.
 * For client-side API with multiple clients.
 */
export function pollingManagerCSFactory(
  definitionFetcherFactory = splitChangesFetcherFactory,
): (params: ISdkFactoryContextSync) => IPollingManagerCS {

  return function (params: ISdkFactoryContextSync): IPollingManagerCS {
    const { serviceApi, storage, readiness, settings } = params;
    const log = settings.log;

    const definitionChangesFetcher = definitionFetcherFactory(params);
    const definitionsSyncTask = definitionsSyncTaskFactory(definitionChangesFetcher, storage, readiness, settings);

    // Map of matching keys to their corresponding MySegmentsSyncTask.
    const mySegmentsSyncTasks: Record<string, IMySegmentsSyncTask> = {};
    // Map of matching keys to the backoff of their MySegmentsSyncTask, used by `syncAll(true)`.
    const mySegmentsBackoffs: Record<string, Backoff> = {};
    const definitionsBackoff = new Backoff(() => definitionsSyncTask.execute());

    const matchingKey = getMatching(settings.core.key);
    const mySegmentsSyncTask = add(matchingKey, readiness, storage);

    function startMySegmentsSyncTasks() {
      forOwn(mySegmentsSyncTasks, (mySegmentsSyncTask) => {
        mySegmentsSyncTask.start();
      });
    }

    function stopMySegmentsSyncTasks() {
      forOwn(mySegmentsSyncTasks, (mySegmentsSyncTask) => {
        if (mySegmentsSyncTask.isRunning()) mySegmentsSyncTask.stop();
      });
    }

    // smart pausing
    readiness.definitions.on(SDK_DEFINITIONS_ARRIVED, () => {
      if (!definitionsSyncTask.isRunning()) return; // noop if not doing polling
      const usingSegments = usesSegmentsSync(storage);
      if (usingSegments !== mySegmentsSyncTask.isRunning()) {
        log.info(POLLING_SMART_PAUSING, [usingSegments ? 'ON' : 'OFF']);
        if (usingSegments) {
          startMySegmentsSyncTasks();
        } else {
          stopMySegmentsSyncTasks();
        }
      }
    });

    /**
     * Creates and registers the MySegmentsSyncTask of a client.
     * @param startSync - true if the SyncManager is running, to start syncing the client memberships: periodic fetch if polling,
     * initial fetch if streaming, or initial fetch retried with backoff if synchronization is disabled (single sync).
     */
    function add(matchingKey: string, readiness: IReadinessManager, storage: IStorageSync, startSync?: boolean) {
      const mySegmentsSyncTask = mySegmentsSyncTaskFactory(serviceApi.fetchMemberships, storage, readiness, settings, matchingKey);

      // smart ready
      function smartReady(metadata: SdkUpdateMetadata) {
        if (!readiness.isReady() && !usesSegmentsSync(storage)) readiness.segments.emit(SDK_SEGMENTS_ARRIVED, metadata);
      }
      if (!usesSegmentsSync(storage)) setTimeout(smartReady, 0);
      else readiness.definitions.once(SDK_DEFINITIONS_ARRIVED, smartReady);

      mySegmentsSyncTasks[matchingKey] = mySegmentsSyncTask;

      if (startSync) {
        if (settings.sync.enabled) {
          if (settings.streamingEnabled) {
            if (definitionsSyncTask.isRunning()) {
              // if polling, start the periodic fetch
              if (usesSegmentsSync(storage)) mySegmentsSyncTask.start();
            } else {
              // if not polling, execute the initial fetch of segments
              // since `syncAll` was already executed when starting the main client
              mySegmentsSyncTask.execute();
            }
          } else {
            if (usesSegmentsSync(storage)) mySegmentsSyncTask.start();
          }
        } else {
          // if single sync, execute the initial fetch with backoff
          if (!readiness.isReady()) {
            const mySegmentsBackoff = new Backoff(() => mySegmentsSyncTask.execute());
            mySegmentsBackoffs[matchingKey] = mySegmentsBackoff;
            mySegmentsBackoff.callUntilSuccess();
          }
        }
      }

      return mySegmentsSyncTask;
    }

    return {
      definitionsSyncTask,
      segmentsSyncTask: mySegmentsSyncTask,

      // Start periodic fetching (polling)
      start() {
        log.info(POLLING_START);

        definitionsSyncTask.start();
        if (usesSegmentsSync(storage)) startMySegmentsSyncTasks();
      },

      // Stop periodic fetching (polling)
      stop() {
        if (definitionsSyncTask.isRunning()) {
          log.info(POLLING_STOP);
          definitionsSyncTask.stop();
        }
        stopMySegmentsSyncTasks();

        // halt the retries of `syncAll`
        definitionsBackoff.stop();
        forOwn(mySegmentsBackoffs, (backoff) => backoff.stop());
      },

      // Used by SyncManager to know if running in polling mode.
      isRunning: definitionsSyncTask.isRunning,

      // fetch definitions and segments
      syncAll(retryWithBackoff) {
        const promises = [retryWithBackoff ? definitionsBackoff.callUntilSuccess() : definitionsSyncTask.execute()];
        forOwn(mySegmentsSyncTasks, (mySegmentsSyncTask, matchingKey) => {
          promises.push(retryWithBackoff ? mySegmentsBackoffs[matchingKey].callUntilSuccess() : mySegmentsSyncTask.execute());
        });
        return Promise.all(promises);
      },

      // Support for handling mySegments sync of multiple clients
      add,

      // Stops syncing the client memberships and unregisters its MySegmentsSyncTask. No-op if not registered
      remove(matchingKey: string) {
        const mySegmentsSyncTask = mySegmentsSyncTasks[matchingKey];
        if (mySegmentsSyncTask && mySegmentsSyncTask.isRunning()) mySegmentsSyncTask.stop();
        delete mySegmentsSyncTasks[matchingKey];

        const mySegmentsBackoff = mySegmentsBackoffs[matchingKey];
        if (mySegmentsBackoff) mySegmentsBackoff.stop();
        delete mySegmentsBackoffs[matchingKey];
      },

      get(matchingKey: string) {
        return mySegmentsSyncTasks[matchingKey];
      }
    };

  };
}
