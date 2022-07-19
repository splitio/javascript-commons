import { IFetchSegmentChanges } from '../../../services/types';
import { ISegmentChangesResponse } from '../../../dtos/types';
import { ISegmentChangesFetcher } from './types';

function greedyFetch(fetchSegmentChanges: IFetchSegmentChanges, since: number, segmentName: string, noCache?: boolean, targetTill?: number): Promise<ISegmentChangesResponse[]> {
  return fetchSegmentChanges(since, segmentName, noCache, targetTill)
    .then(resp => resp.json())
    .then((json: ISegmentChangesResponse) => {
      let { since, till } = json;
      if (since === till) {
        return [json];
      } else {
        return Promise.all([json, greedyFetch(fetchSegmentChanges, till, segmentName, noCache, targetTill)]).then(flatMe => {
          return [flatMe[0], ...flatMe[1]];
        });
      }
    });
}

/**
 * Factory of SegmentChanges fetcher.
 * SegmentChanges fetcher is a wrapper around `segmentChanges` API service that parses the response and handle errors and retries.
 */
export function segmentChangesFetcherFactory(fetchSegmentChanges: IFetchSegmentChanges): ISegmentChangesFetcher {

  return function segmentChangesFetcher(
    since: number,
    segmentName: string,
    noCache?: boolean,
    till?: number,
    // Optional decorator for `fetchMySegments` promise, such as timeout or time tracker
    decorator?: (promise: Promise<ISegmentChangesResponse[]>) => Promise<ISegmentChangesResponse[]>
  ): Promise<ISegmentChangesResponse[]> {

    let segmentsPromise = greedyFetch(fetchSegmentChanges, since, segmentName, noCache, till);
    if (decorator) segmentsPromise = decorator(segmentsPromise);

    return segmentsPromise;
  };

}
