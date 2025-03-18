import { matcherTypes } from '../../matcherTypes';
import { matcherFactory } from '../..';
import { IMatcher, IMatcherDto } from '../../../types';
import { IStorageSync } from '../../../../storages/types';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

test('MATCHER IN_SEGMENT / should return true ONLY when the segment is defined inside the segment storage', async () => {
  const segment = 'employees';

  const matcherTrue = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SEGMENT,
    value: segment
  } as IMatcherDto, {
    segments: {
      isInSegment(segmentName) {
        return segment === segmentName;
      }
    }
  } as IStorageSync) as IMatcher;

  const matcherFalse = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SEGMENT,
    value: segment + 'asd'
  } as IMatcherDto, {
    segments: {
      isInSegment(segmentName) {
        return segment === segmentName;
      }
    }
  } as IStorageSync) as IMatcher;

  expect(await matcherTrue('key')).toBe(true); // segment found in mySegments list
  expect(await matcherFalse('key')).toBe(false); // segment not found in mySegments list
});

test('MATCHER IN_LARGE_SEGMENT / should return true ONLY when the segment is defined inside the segment storage', async () => {
  const segment = 'employees';

  const matcherTrue = matcherFactory(loggerMock, {
    type: matcherTypes.IN_LARGE_SEGMENT,
    value: segment
  } as IMatcherDto, {
    largeSegments: {
      isInSegment(segmentName) {
        return segment === segmentName;
      }
    }
  } as IStorageSync) as IMatcher;

  const matcherFalse = matcherFactory(loggerMock, {
    type: matcherTypes.IN_LARGE_SEGMENT,
    value: segment
  } as IMatcherDto, {
    largeSegments: undefined
  } as IStorageSync) as IMatcher;

  expect(await matcherTrue('key')).toBe(true); // large segment found in mySegments list
  expect(await matcherFalse('key')).toBe(false); // large segment storage is not defined
});
