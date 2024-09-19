import { IInSegmentMatcherData, IInLargeSegmentMatcherData } from '../../dtos/types';

/**
 * Extract segment name as a plain string.
 */
export function segmentTransform(segment?: IInSegmentMatcherData | IInLargeSegmentMatcherData) {
  return segment ?
    (segment as IInSegmentMatcherData).segmentName || (segment as IInLargeSegmentMatcherData).largeSegmentName :
    undefined;
}
