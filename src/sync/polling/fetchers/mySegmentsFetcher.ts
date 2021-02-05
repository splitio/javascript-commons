import { SplitError } from '../../../utils/lang/errors';
import { IFetchMySegments } from '../../../services/types';
import { IMySegmentsResponseItem } from '../../../dtos/types';
import { IMySegmentsFetcher } from './types';

/**
 * Factory of MySegments fetcher.
 * MySegments fetcher is a wrapper around `mySegments` API service that parses the response and handle errors.
 */
export default function mySegmentsFetcherFactory(fetchMySegments: IFetchMySegments, userMatchingKey: string): IMySegmentsFetcher {

  return function mySegmentsFetcher(
    // Optional decorator for `fetchMySegments` promise, such as timeout or time tracker
    decorator?: (promise: Promise<Response>) => Promise<Response>
  ): Promise<string[]> {

    let mySegmentsPromise = fetchMySegments(userMatchingKey);
    if (decorator) mySegmentsPromise = decorator(mySegmentsPromise);

    // Extract segment names
    return mySegmentsPromise
      // JSON parsing errors are handled as SplitErrors, to distinguish from user callback errors
      .then(resp => resp.json().catch(error => { throw new SplitError(error.message); }))
      .then(json => json.mySegments.map((segment: IMySegmentsResponseItem) => segment.name));
  };

}
