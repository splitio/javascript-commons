import { ISplit } from '../dtos/types';
import { setToArray, _Set } from '../utils/lang/sets';

/**
 * Collect segments from a raw split definition.
 * Exported for testing purposes.
 */
export function _parseSegments({ conditions }: ISplit) {
  let segments = new _Set<string>();

  for (let i = 0; i < conditions.length; i++) {
    const matchers = conditions[i].matcherGroup.matchers;

    matchers.forEach(matcher => {
      if (matcher.matcherType === 'IN_SEGMENT') segments.add(matcher.userDefinedSegmentMatcherData.segmentName);
    });
  }

  return segments;
}

/**
 * Computes the set of segments used by splits.
 */
export function getRegisteredSegments(splitDefs: string[]) {
  const segments = new _Set<string>();
  splitDefs.forEach(split => {
    const parsedSplit: ISplit = JSON.parse(split);
    _parseSegments(parsedSplit).forEach((segmentName: string) => {
      segments.add(segmentName);
    });
  });
  return setToArray(segments);
}
