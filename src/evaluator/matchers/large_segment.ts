import { MaybeThenable } from '../../dtos/types';
import { ISegmentsCacheBase } from '../../storages/types';

export function largeSegmentMatcherContext(largeSegmentName: string, storage: { largeSegments?: ISegmentsCacheBase }) {

  return function largeSegmentMatcher(key: string): MaybeThenable<boolean> {
    const isInLargeSegment = storage.largeSegments ? storage.largeSegments.isInSegment(largeSegmentName, key) : false;

    return isInLargeSegment;
  };
}
