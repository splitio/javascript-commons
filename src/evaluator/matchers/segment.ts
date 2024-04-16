import { MaybeThenable } from '../../dtos/types';
import { ISegmentsCacheBase } from '../../storages/types';
import { thenable } from '../../utils/promise/thenable';

export function segmentMatcherContext(segmentName: string, storage: { segments: ISegmentsCacheBase }) {

  return function segmentMatcher(key: string): MaybeThenable<boolean> {
    const isInSegment = storage.segments.isInSegment(segmentName, key);

    if (thenable(isInSegment)) {
      isInSegment.then(result => {
        return result;
      });
    }

    return isInSegment;
  };
}
