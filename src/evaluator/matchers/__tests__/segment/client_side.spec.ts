import { matcherTypes } from '../../matcherTypes';
import matcherFactory from '../..';
import { IMatcher, IMatcherDto } from '../../../types';
import { IStorageSync } from '../../../../storages/types';

test('MATCHER IN_SEGMENT / should return true ONLY when the segment is defined inside the segment storage', async function () {
  const segment = 'employees';

  const matcherTrue = matcherFactory({
    type: matcherTypes.IN_SEGMENT,
    value: segment
  } as IMatcherDto, {
    segments: {
      isInSegment(segmentName) {
        return segment === segmentName;
      }
    }
  } as IStorageSync) as IMatcher;

  const matcherFalse = matcherFactory({
    type: matcherTypes.IN_SEGMENT,
    value: segment + 'asd'
  } as IMatcherDto, {
    segments: {
      isInSegment(segmentName) {
        return segment === segmentName;
      }
    }
  } as IStorageSync) as IMatcher;

  expect(await matcherTrue()).toBe(true); // segment found in mySegments list
  expect(await matcherFalse()).toBe(false); // segment not found in mySegments list
});
