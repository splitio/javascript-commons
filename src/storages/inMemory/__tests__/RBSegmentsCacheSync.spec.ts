import { RBSegmentsCacheInMemory } from '../RBSegmentsCacheInMemory';
import { RBSegmentsCacheInLocal } from '../../inLocalStorage/RBSegmentsCacheInLocal';
import { KeyBuilderCS } from '../../KeyBuilderCS';
import { rbSegment, rbSegmentWithInSegmentMatcher } from '../../__tests__/testUtils';
import { IRBSegmentsCacheSync } from '../../types';
import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';

const cacheInMemory = new RBSegmentsCacheInMemory();
const cacheInLocal = new RBSegmentsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'));

describe.each([cacheInMemory, cacheInLocal])('RB SEGMENTS CACHE', (cache: IRBSegmentsCacheSync) => {

  beforeEach(() => {
    cache.clear();
  });

  test('clear should reset the cache state', () => {
    cache.update([rbSegment], [], 1);
    expect(cache.getChangeNumber()).toBe(1);
    expect(cache.get(rbSegment.name)).not.toBeNull();

    cache.clear();
    expect(cache.getChangeNumber()).toBe(-1);
    expect(cache.get(rbSegment.name)).toBeNull();
  });

  test('update should add and remove segments correctly', () => {
    // Add segments
    const updated1 = cache.update([rbSegment, rbSegmentWithInSegmentMatcher], [], 1);
    expect(updated1).toBe(true);
    expect(cache.get(rbSegment.name)).toEqual(rbSegment);
    expect(cache.get(rbSegmentWithInSegmentMatcher.name)).toEqual(rbSegmentWithInSegmentMatcher);
    expect(cache.getChangeNumber()).toBe(1);

    // Remove segments
    const updated2 = cache.update([], [rbSegment], 2);
    expect(updated2).toBe(true);
    expect(cache.get(rbSegment.name)).toBeNull();
    expect(cache.get(rbSegmentWithInSegmentMatcher.name)).toEqual(rbSegmentWithInSegmentMatcher);
    expect(cache.getChangeNumber()).toBe(2);
  });

  test('contains should check for segment existence correctly', () => {
    cache.update([rbSegment, rbSegmentWithInSegmentMatcher], [], 1);

    expect(cache.contains(new Set([rbSegment.name]))).toBe(true);
    expect(cache.contains(new Set([rbSegment.name, rbSegmentWithInSegmentMatcher.name]))).toBe(true);
    expect(cache.contains(new Set(['nonexistent']))).toBe(false);
    expect(cache.contains(new Set([rbSegment.name, 'nonexistent']))).toBe(false);
  });

  test('usesSegments should track segments usage correctly', () => {
    expect(cache.usesSegments()).toBe(true); // Initially true when changeNumber is -1

    cache.update([rbSegment], [], 1); // rbSegment doesn't have IN_SEGMENT matcher
    expect(cache.usesSegments()).toBe(false);

    cache.update([rbSegmentWithInSegmentMatcher], [], 2); // rbSegmentWithInSegmentMatcher has IN_SEGMENT matcher
    expect(cache.usesSegments()).toBe(true);

    cache.clear();
    expect(cache.usesSegments()).toBe(true); // True after clear since changeNumber is -1
  });
});
