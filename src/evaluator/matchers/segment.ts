import { MaybeThenable } from '../../dtos/types';
import { ISegmentsCacheBase } from '../../storages/types';

export function segmentMatcherContext(segmentName: string, storage: { segments: ISegmentsCacheBase }) {

  return function segmentMatcher(key: string): MaybeThenable<boolean> {
    const isInSegment = storage.segments.isInSegment(segmentName, key);

    return isInSegment;
  };
}
