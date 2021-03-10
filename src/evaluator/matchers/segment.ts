import { MaybeThenable } from '../../dtos/types';
import { ISegmentsCacheBase } from '../../storages/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import thenable from '../../utils/promise/thenable';
import { DEBUG_18, DEBUG_19 } from '../../logger/constants';

export default function matcherSegmentContext(log: ILogger, segmentName: string, storage: { segments: ISegmentsCacheBase }) {

  return function segmentMatcher(key: string): MaybeThenable<boolean> {
    const isInSegment = storage.segments.isInSegment(segmentName, key);

    if (thenable(isInSegment)) {
      isInSegment.then(result => {
        log.debug(DEBUG_18, [segmentName, key, isInSegment]);

        return result;
      });
    } else {
      log.debug(DEBUG_19, [segmentName, key, isInSegment]);
    }

    return isInSegment;
  };

}
