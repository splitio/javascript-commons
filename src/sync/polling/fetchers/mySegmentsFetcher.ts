import { IFetchMemberships, IResponse } from '../../../services/types';
import { IMembershipsResponse } from '../../../dtos/types';
import { IMySegmentsFetcher } from './types';

/**
 * Factory of MySegments fetcher.
 * MySegments fetcher is a wrapper around `mySegments` API service that parses the response and handle errors.
 */
export function mySegmentsFetcherFactory(fetchMemberships: IFetchMemberships): IMySegmentsFetcher {

  return function mySegmentsFetcher(
    userMatchingKey: string,
    noCache?: boolean,
    till?: number,
    // Optional decorator for `fetchMemberships` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ): Promise<IMembershipsResponse> {

    let mySegmentsPromise = fetchMemberships(userMatchingKey, noCache, till);
    if (decorator) mySegmentsPromise = decorator(mySegmentsPromise);

    return mySegmentsPromise.then(resp => resp.json());
  };

}
