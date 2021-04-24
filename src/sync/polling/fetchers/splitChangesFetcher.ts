import { IFetchSplitChanges } from '../../../services/types';
import { ISplitChangesFetcher } from './types';

/**
 * Factory of SplitChanges fetcher.
 * SplitChanges fetcher is a wrapper around `splitChanges` API service that parses the response and handle errors.
 */
export default function splitChangesFetcherFactory(fetchSplitChanges: IFetchSplitChanges): ISplitChangesFetcher {

  return function splitChangesFetcher(
    since: number,
    noCache?: boolean,
    // Optional decorator for `fetchSplitChanges` promise, such as timeout or time tracker
    decorator?: (promise: Promise<Response>) => Promise<Response>
  ) {

    let splitsPromise = fetchSplitChanges(since, noCache);
    if (decorator) splitsPromise = decorator(splitsPromise);

    return splitsPromise.then(resp => resp.json());
  };

}
