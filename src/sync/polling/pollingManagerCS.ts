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
import { mySegmentsFetcherFactory } from './fetchers/mySegmentsFetcher';

/**
 * Expose start / stop mechanism for polling data from services.
 * For client-side API with multiple clients.
 */
export function pollingManagerCSFactory(
  definitionFetcherFactory = splitChangesFetcherFactory,
  mySegmentFetcherFactory = (params: ISdkFactoryContextSync) => mySegmentsFetcherFactory(params.serviceApi.fetchMemberships)
): (params: ISdkFactoryContextSync) => IPollingManagerCS {

  return function (params: ISdkFactoryContextSync): IPollingManagerCS {
    const { storage, readiness, settings } = params;
    const log = settings.log;

    const definitionChangesFetcher = definitionFetcherFactory(params);
    const definitionsSyncTask = definitionsSyncTaskFactory(definitionChangesFetcher, storage, readiness, settings);
    const mySegmentsFetcher = mySegmentFetcherFactory(params);

    // Map of matching keys to their corresponding MySegmentsSyncTask.
    const mySegmentsSyncTasks: Record<string, IMySegmentsSyncTask> = {};
    // Map of matching keys to the backoff of their MySegmentsSyncTask, used to retry the initial fetch of memberships.
    const mySegmentsBackoffs: Record<string, Backoff> = {};
    const definitionsBackoff = new Backoff(() => definitionsSyncTask.execute());

    // Halts the retries of `syncAll` and of the initial fetch of memberships
    function stopBackoffs() {
      definitionsBackoff.stop();
      forOwn(mySegmentsBackoffs, (backoff) => backoff.stop());
    }

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
     * or initial fetch retried with backoff if streaming or synchronization is disabled (single sync).
     */
    function add(matchingKey: string, readiness: IReadinessManager, storage: IStorageSync, startSync?: boolean) {
      const mySegmentsSyncTask = mySegmentsSyncTaskFactory(mySegmentsFetcher, storage, readiness, settings, matchingKey);
      const usingSegments = usesSegmentsSync(storage);

      // smart ready
      function smartReady(metadata: SdkUpdateMetadata) {
        if (!readiness.isReady() && !usesSegmentsSync(storage)) readiness.segments.emit(SDK_SEGMENTS_ARRIVED, metadata);
      }
      if (!usingSegments) setTimeout(smartReady, 0);
      else readiness.definitions.once(SDK_DEFINITIONS_ARRIVED, smartReady);

      mySegmentsSyncTasks[matchingKey] = mySegmentsSyncTask;
      const mySegmentsBackoff = mySegmentsBackoffs[matchingKey] = new Backoff(() => mySegmentsSyncTask.execute());

      if (startSync) {
        if (settings.sync.enabled && (!settings.streamingEnabled || definitionsSyncTask.isRunning())) {
          // if polling, start the periodic fetch
          if (usingSegments) mySegmentsSyncTask.start();
        } else {
          // if streaming or single sync, execute the initial fetch with backoff. In single sync, skip it if segments are not used,
          // since the client is ready by smart ready. In streaming, it's not skipped, because nothing would fetch the memberships
          // if definitions later use segments. `syncAll` might also call it, if the client is added before it runs: the backoff runs only once
          if (settings.sync.enabled || usingSegments) mySegmentsBackoff.callUntilSuccess();
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
        stopBackoffs(); // polling takes over the retries

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
        stopBackoffs();
      },

      // Used by SyncManager to know if running in polling mode.
      isRunning: definitionsSyncTask.isRunning,

      // fetch definitions and memberships, retrying with backoff
      syncAll() {
        const promises = [definitionsBackoff.callUntilSuccess()];
        forOwn(mySegmentsBackoffs, (mySegmentsBackoff) => {
          promises.push(mySegmentsBackoff.callUntilSuccess());
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
