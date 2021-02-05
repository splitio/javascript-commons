import { IFetchSegmentChanges } from '../../../services/types';
import { ISegmentChangesResponse } from '../../../dtos/types';
import { ISegmentChangesFetcher } from './types';

function greedyFetch(fetchSegmentChanges: IFetchSegmentChanges, since: number, segmentName: string): Promise<ISegmentChangesResponse[]> {
  return fetchSegmentChanges(since, segmentName)
    // no need to handle json parsing errors as SplitError, since errors are handled differently for segments
    .then(resp => resp.json())
    .then((json: ISegmentChangesResponse) => {
      let { since, till } = json;
      if (since === till) {
        return [json];
      } else {
        return Promise.all([json, greedyFetch(fetchSegmentChanges, till, segmentName)]).then(flatMe => {
          return [flatMe[0], ...flatMe[1]];
        });
      }
    })
    .catch(err => {
      // If the operation is forbidden it may be due to permissions, don't recover and propagate the error.
      if (err.statusCode === 403) throw err;
      // if something goes wrong with the request to the server, we are going to
      // stop requesting information till the next round of downloading
      return [];
    });
}

/**
 * Factory of SegmentChanges fetcher.
 * SegmentChanges fetcher is a wrapper around `segmentChanges` API service that parses the response and handle errors and retries.
 */
export default function segmentChangesFetcherFactory(fetchSegmentChanges: IFetchSegmentChanges): ISegmentChangesFetcher {

  return function segmentChangesFetcher(
    since: number,
    segmentName: string,
    // Optional decorator for `fetchMySegments` promise, such as timeout or time tracker
    decorator?: (promise: Promise<ISegmentChangesResponse[]>) => Promise<ISegmentChangesResponse[]>
  ): Promise<ISegmentChangesResponse[]> {

    let segmentsPromise = greedyFetch(fetchSegmentChanges, since, segmentName);
    if (decorator) segmentsPromise = decorator(segmentsPromise);

    return segmentsPromise;
  };

}
