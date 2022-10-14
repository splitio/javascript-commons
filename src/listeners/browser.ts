/* eslint-disable no-undef */
// @TODO eventually migrate to JS-Browser-SDK package.
import { ISignalListener } from './types';
import { IRecorderCacheSync, IStorageSync } from '../storages/types';
import { fromImpressionsCollector } from '../sync/submitters/impressionsSubmitter';
import { fromImpressionCountsCollector } from '../sync/submitters/impressionCountsSubmitter';
import { IResponse, ISplitApi } from '../services/types';
import { ImpressionDTO, ISettings } from '../types';
import { ImpressionsPayload } from '../sync/submitters/types';
import { OPTIMIZED, DEBUG, NONE } from '../utils/constants';
import { objectAssign } from '../utils/lang/objectAssign';
import { CLEANUP_REGISTERING, CLEANUP_DEREGISTERING } from '../logger/constants';
import { ISyncManager } from '../sync/types';
import { isConsentGranted } from '../consent';

const VISIBILITYCHANGE_EVENT = 'visibilitychange';
const PAGEHIDE_EVENT = 'pagehide';
const UNLOAD_EVENT = 'unload';
const EVENT_NAME = 'for unload page event.';

/**
 * We'll listen for events over the window object.
 */
export class BrowserSignalListener implements ISignalListener {

  private fromImpressionsCollector: (data: ImpressionDTO[]) => ImpressionsPayload;

  constructor(
    private syncManager: ISyncManager | undefined,
    private settings: ISettings,
    private storage: IStorageSync,
    private serviceApi: ISplitApi,
  ) {
    this.flushData = this.flushData.bind(this);
    this.flushDataIfHidden = this.flushDataIfHidden.bind(this);
    this.stopSync = this.stopSync.bind(this);
    this.fromImpressionsCollector = fromImpressionsCollector.bind(undefined, settings.core.labelsEnabled);
  }

  /**
   * start method.
   * Called when SplitFactory is initialized, it adds event listeners to close streaming and flush impressions and events.
   */
  start() {
    this.settings.log.debug(CLEANUP_REGISTERING, [EVENT_NAME]);
    if (typeof document !== 'undefined' && document.addEventListener) {
      // Flush data whenever the page is hidden or unloaded.
      document.addEventListener(VISIBILITYCHANGE_EVENT, this.flushDataIfHidden);
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      // Some browsers like Safari does not fire the `visibilitychange` event when the page is being unloaded. So we also flush data in the `pagehide` event.
      // If both events are triggered, the last one will find the storage empty, so no duplicated data will be submitted.
      window.addEventListener(PAGEHIDE_EVENT, this.flushData);
      // Stop streaming on 'unload' event. Used instead of 'beforeunload', because 'unload' is not a cancelable event, so no other listeners can stop the event from occurring.
      window.addEventListener(UNLOAD_EVENT, this.stopSync);
    }
  }

  /**
   * stop method.
   * Called when client is destroyed, it removes event listeners.
   */
  stop() {
    this.settings.log.debug(CLEANUP_DEREGISTERING, [EVENT_NAME]);
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener(VISIBILITYCHANGE_EVENT, this.flushDataIfHidden);
    }
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener(PAGEHIDE_EVENT, this.flushData);
      window.removeEventListener(UNLOAD_EVENT, this.stopSync);
    }
  }

  stopSync() {
    // Close streaming connection
    if (this.syncManager && this.syncManager.pushManager) this.syncManager.pushManager.stop();
  }

  /**
   * flushData method.
   * Called when pagehide event is triggered. It flushed remaining impressions and events to the backend,
   * using beacon API if possible, or falling back to regular post transport.
   */
  flushData() {
    if (!this.syncManager) return; // In consumer mode there is not sync manager and data to flush
    const { events, telemetry } = this.settings.urls;

    // Flush impressions & events data if there is user consent
    if (isConsentGranted(this.settings)) {
      const sim = this.settings.sync.impressionsMode;
      const extraMetadata = {
        // sim stands for Sync/Split Impressions Mode
        sim: sim === OPTIMIZED ? OPTIMIZED : sim === DEBUG ? DEBUG : NONE
      };

      this._flushData(events + '/testImpressions/beacon', this.storage.impressions, this.serviceApi.postTestImpressionsBulk, this.fromImpressionsCollector, extraMetadata);
      this._flushData(events + '/events/beacon', this.storage.events, this.serviceApi.postEventsBulk);
      if (this.storage.impressionCounts) this._flushData(events + '/testImpressions/count/beacon', this.storage.impressionCounts, this.serviceApi.postTestImpressionsCount, fromImpressionCountsCollector);
      // @ts-ignore
      if (this.storage.uniqueKeys) this._flushData(telemetry + '/v1/keys/cs/beacon', this.storage.uniqueKeys, this.serviceApi.postUniqueKeysBulkCs);
    }

    // Flush telemetry data
    if (this.storage.telemetry) this._flushData(telemetry + '/v1/metrics/usage/beacon', this.storage.telemetry, this.serviceApi.postMetricsUsage);
  }

  flushDataIfHidden() {
    // Precondition: document defined
    if (document.visibilityState === 'hidden') this.flushData(); // On a 'visibilitychange' event, flush data if state is hidden
  }

  private _flushData<T>(url: string, cache: IRecorderCacheSync<T>, postService: (body: string) => Promise<IResponse>, fromCacheToPayload?: (cacheData: T) => any, extraMetadata?: {}) {
    // if there is data in cache, send it to backend
    if (!cache.isEmpty()) {
      const dataPayload = fromCacheToPayload ? fromCacheToPayload(cache.pop()) : cache.pop();
      if (!this._sendBeacon(url, dataPayload, extraMetadata)) {
        postService(JSON.stringify(dataPayload)).catch(() => { }); // no-op to handle possible promise rejection
      }
    }
  }

  /**
   * _sendBeacon method.
   * Util method that check if beacon API is available, build the payload and send it.
   * Returns true if beacon API was used successfully, false otherwise.
   */
  private _sendBeacon(url: string, data: any, extraMetadata?: {}) {
    // eslint-disable-next-line compat/compat
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const json = {
        entries: data,
        token: this.settings.core.authorizationKey,
        sdk: this.settings.version
      };

      // Extend with endpoint specific metadata where needed
      if (extraMetadata) objectAssign(json, extraMetadata);

      // Stringify the payload
      const payload = JSON.stringify(json);

      // https://xgwang.me/posts/you-may-not-know-beacon/#it-may-throw-error%2C-be-sure-to-catch
      try { // eslint-disable-next-line compat/compat
        return navigator.sendBeacon(url, payload);
      } catch (e) {
        return false;
      }
    }
    return false;
  }
}
