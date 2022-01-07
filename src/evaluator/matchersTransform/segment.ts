import { IInSegmentMatcherData } from '../../dtos/types';

/**
 * Extract segment name as a plain string.
 */
export function segmentTransform(segment?: IInSegmentMatcherData) {
  return segment ? segment.segmentName : undefined;
}
