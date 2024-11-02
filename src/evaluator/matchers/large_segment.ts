import { MaybeThenable } from '../../dtos/types';
import { ISegmentsCacheBase } from '../../storages/types';
import { thenable } from '../../utils/promise/thenable';

export function largeSegmentMatcherContext(largeSegmentName: string, storage: { largeSegments?: ISegmentsCacheBase }) {

  return function largeSegmentMatcher(key: string): MaybeThenable<boolean> {
    const isInLargeSegment = storage.largeSegments ? storage.largeSegments.isInSegment(largeSegmentName, key) : false;

    if (thenable(isInLargeSegment)) {
      isInLargeSegment.then(result => {
        return result;
      });
    }

    return isInLargeSegment;
  };
}
