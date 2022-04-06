import { IFetchMySegments, IResponse } from '../../../services/types';
import { IMySegmentsResponseItem } from '../../../dtos/types';
import { IMySegmentsFetcher } from './types';

/**
 * Factory of MySegments fetcher.
 * MySegments fetcher is a wrapper around `mySegments` API service that parses the response and handle errors.
 */
export function mySegmentsFetcherFactory(fetchMySegments: IFetchMySegments): IMySegmentsFetcher {

  return function mySegmentsFetcher(
    userMatchingKey: string,
    noCache?: boolean,
    // Optional decorator for `fetchMySegments` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ): Promise<string[]> {

    let mySegmentsPromise = fetchMySegments(userMatchingKey, noCache);
    if (decorator) mySegmentsPromise = decorator(mySegmentsPromise);

    // Extract segment names
    return mySegmentsPromise
      .then(resp => resp.json())
      .then(json => json.mySegments.map((segment: IMySegmentsResponseItem) => segment.name));
  };

}
