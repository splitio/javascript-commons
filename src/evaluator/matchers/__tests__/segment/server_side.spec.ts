import { matcherTypes } from '../../matcherTypes';
import { matcherFactory } from '../..';
import { IMatcher, IMatcherDto } from '../../../types';
import { IStorageSync } from '../../../../storages/types';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

test('MATCHER IN_SEGMENT / should return true ONLY when the key is defined inside the segment', async () => {
  const segment = 'employees';

  const matcher = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SEGMENT,
    value: segment
  } as IMatcherDto, {
    segments: {
      isInSegment(segmentName, key) {
        return key === 'key';
      }
    }
  } as IStorageSync) as IMatcher;

  expect(await matcher('key')).toBe(true); // "key" should be true
  expect(await matcher('another_key')).toBe(false); // "another key" should be false
});
