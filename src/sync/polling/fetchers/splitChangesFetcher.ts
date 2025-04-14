import { ISettings } from '../../../../types/splitio';
import { ISplitChangesResponse } from '../../../dtos/types';
import { IFetchSplitChanges, IResponse } from '../../../services/types';
import { IStorageBase } from '../../../storages/types';
import { FLAG_SPEC_VERSION } from '../../../utils/constants';
import { base } from '../../../utils/settingsValidation';
import { ISplitChangesFetcher } from './types';

const PROXY_CHECK_INTERVAL_MILLIS_CS = 60 * 60 * 1000; // 1 hour in Client Side
const PROXY_CHECK_INTERVAL_MILLIS_SS = 24 * PROXY_CHECK_INTERVAL_MILLIS_CS; // 24 hours in Server Side

function sdkEndpointOverriden(settings: ISettings) {
  return settings.urls.sdk !== base.urls.sdk;
}

/**
 * Factory of SplitChanges fetcher.
 * SplitChanges fetcher is a wrapper around `splitChanges` API service that parses the response and handle errors.
 */
export function splitChangesFetcherFactory(fetchSplitChanges: IFetchSplitChanges, settings: ISettings, storage: Pick<IStorageBase, 'splits' | 'rbSegments'>): ISplitChangesFetcher {

  const PROXY_CHECK_INTERVAL_MILLIS = settings.core.key !== undefined ? PROXY_CHECK_INTERVAL_MILLIS_CS : PROXY_CHECK_INTERVAL_MILLIS_SS;
  let _lastProxyCheckTimestamp: number | undefined;

  return function splitChangesFetcher(
    since: number,
    noCache?: boolean,
    till?: number,
    rbSince?: number,
    // Optional decorator for `fetchSplitChanges` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ): Promise<ISplitChangesResponse> {

    if (_lastProxyCheckTimestamp && (Date.now() - _lastProxyCheckTimestamp) > PROXY_CHECK_INTERVAL_MILLIS) {
      settings.sync.flagSpecVersion = FLAG_SPEC_VERSION;
    }

    let splitsPromise = fetchSplitChanges(since, noCache, till, rbSince)
      // Handle proxy errors with spec 1.3
      .catch((err) => {
        if (err.statusCode === 400 && sdkEndpointOverriden(settings) && settings.sync.flagSpecVersion === FLAG_SPEC_VERSION) {
          _lastProxyCheckTimestamp = Date.now();
          settings.sync.flagSpecVersion = '1.2'; // fallback to 1.2 spec
          return fetchSplitChanges(since, noCache, till); // retry request without rbSince
        }
        throw err;
      });

    if (decorator) splitsPromise = decorator(splitsPromise);

    return splitsPromise
      .then(resp => resp.json())
      .then(data => {
        // Using flag spec version 1.2
        if (data.splits) {
          return {
            ff: {
              d: data.splits,
              s: data.since,
              t: data.till
            }
          };
        }

        // Proxy recovery
        if (_lastProxyCheckTimestamp) {
          _lastProxyCheckTimestamp = undefined;
          return Promise.all([storage.splits.clear(), storage.rbSegments.clear()])
            .then(() => splitChangesFetcher(-1, undefined, undefined, -1));
        }

        return data;
      });
  };

}
