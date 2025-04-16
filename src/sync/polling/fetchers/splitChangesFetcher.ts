import { ISettings } from '../../../types';
import { ISplitChangesResponse } from '../../../dtos/types';
import { IFetchSplitChanges, IResponse } from '../../../services/types';
import { IStorageBase } from '../../../storages/types';
import { FLAG_SPEC_VERSION } from '../../../utils/constants';
import { base } from '../../../utils/settingsValidation';
import { ISplitChangesFetcher } from './types';
import { LOG_PREFIX_SYNC_SPLITS } from '../../../logger/constants';
import { checkIfServerSide } from '../../../utils/key';

const PROXY_CHECK_INTERVAL_MILLIS_CS = 60 * 60 * 1000; // 1 hour in Client Side
const PROXY_CHECK_INTERVAL_MILLIS_SS = 24 * PROXY_CHECK_INTERVAL_MILLIS_CS; // 24 hours in Server Side

function sdkEndpointOverriden(settings: ISettings) {
  return settings.urls.sdk !== base.urls.sdk;
}

/**
 * Factory of SplitChanges fetcher.
 * SplitChanges fetcher is a wrapper around `splitChanges` API service that parses the response and handle errors.
 */
// @TODO breaking: drop support for Split Proxy below v5.10.0 and simplify the implementation
export function splitChangesFetcherFactory(fetchSplitChanges: IFetchSplitChanges, settings: ISettings, storage: Pick<IStorageBase, 'splits' | 'rbSegments'>): ISplitChangesFetcher {

  const log = settings.log;
  const PROXY_CHECK_INTERVAL_MILLIS = checkIfServerSide(settings) ? PROXY_CHECK_INTERVAL_MILLIS_SS : PROXY_CHECK_INTERVAL_MILLIS_CS;
  let lastProxyCheckTimestamp: number | undefined;

  return function splitChangesFetcher(
    since: number,
    noCache?: boolean,
    till?: number,
    rbSince?: number,
    // Optional decorator for `fetchSplitChanges` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ): Promise<ISplitChangesResponse> {

    // Recheck proxy
    if (lastProxyCheckTimestamp && (Date.now() - lastProxyCheckTimestamp) > PROXY_CHECK_INTERVAL_MILLIS) {
      settings.sync.flagSpecVersion = FLAG_SPEC_VERSION;
    }

    let splitsPromise = fetchSplitChanges(since, noCache, till, settings.sync.flagSpecVersion === FLAG_SPEC_VERSION ? rbSince : undefined)
      // Handle proxy error with spec 1.3
      .catch((err) => {
        if (err.statusCode === 400 && sdkEndpointOverriden(settings) && settings.sync.flagSpecVersion === FLAG_SPEC_VERSION) {
          log.error(LOG_PREFIX_SYNC_SPLITS + 'Proxy error detected. If you are using Split Proxy, please upgrade to latest version');
          lastProxyCheckTimestamp = Date.now();
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
        if (lastProxyCheckTimestamp) {
          log.info(LOG_PREFIX_SYNC_SPLITS + 'Proxy error recovered');
          lastProxyCheckTimestamp = undefined;
          return Promise.all([storage.splits.clear(), storage.rbSegments.clear()])
            .then(() => splitChangesFetcher(storage.splits.getChangeNumber() as number, undefined, undefined, storage.rbSegments.getChangeNumber() as number));
        }

        return data;
      });
  };

}
