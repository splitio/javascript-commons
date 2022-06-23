import { MaybeThenable } from '../../dtos/types';
import { ISegmentsCacheBase } from '../../storages/types';
import { ILogger } from '../../logger/types';
import { thenable } from '../../utils/promise/thenable';
import { ENGINE_MATCHER_SEGMENT } from '../../logger/constants';

export function segmentMatcherContext(log: ILogger, segmentName: string, storage: { segments: ISegmentsCacheBase }) {

  return function segmentMatcher(key: string): MaybeThenable<boolean> {
    const isInSegment = storage.segments.isInSegment(segmentName, key);

    if (thenable(isInSegment)) {
      isInSegment.then(result => {
        log.debug(ENGINE_MATCHER_SEGMENT, [segmentName, key, isInSegment]);

        return result;
      });
    } else {
      log.debug(ENGINE_MATCHER_SEGMENT, [segmentName, key, isInSegment]);
    }

    return isInSegment;
  };

}
