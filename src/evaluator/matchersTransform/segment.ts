import { IInSegmentMatcherData } from '../../dtos/types';

/**
 * Extract segment name as a plain string.
 */
export default function transform(segment?: IInSegmentMatcherData) {
  return segment ? segment.segmentName : undefined;
}
