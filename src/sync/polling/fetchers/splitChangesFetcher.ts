import { IFetchSplitChanges, IResponse } from '../../../services/types';
import { ISplitChangesFetcher } from './types';

/**
 * Factory of SplitChanges fetcher.
 * SplitChanges fetcher is a wrapper around `splitChanges` API service that parses the response and handle errors.
 */
export function splitChangesFetcherFactory(fetchSplitChanges: IFetchSplitChanges): ISplitChangesFetcher {

  return function splitChangesFetcher(
    since: number,
    noCache?: boolean,
    till?: number,
    // Optional decorator for `fetchSplitChanges` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ) {

    let splitsPromise = fetchSplitChanges(since, noCache, till);
    if (decorator) splitsPromise = decorator(splitsPromise);

    return splitsPromise.then(resp => resp.json());
  };

}
