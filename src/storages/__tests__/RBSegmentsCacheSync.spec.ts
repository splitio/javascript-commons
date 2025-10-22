import { RBSegmentsCacheInMemory } from '../inMemory/RBSegmentsCacheInMemory';
import { RBSegmentsCacheInLocal } from '../inLocalStorage/RBSegmentsCacheInLocal';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { rbSegment, rbSegmentWithInSegmentMatcher } from '../__tests__/testUtils';
import { IRBSegmentsCacheSync } from '../types';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

const cacheInMemory = new RBSegmentsCacheInMemory();
// eslint-disable-next-line no-undef
const cacheInLocal = new RBSegmentsCacheInLocal(fullSettings, new KeyBuilderCS('SPLITIO', 'user'), localStorage);

describe.each([cacheInMemory, cacheInLocal])('Rule-based segments cache sync (Memory & LocalStorage)', (cache: IRBSegmentsCacheSync) => {

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
    expect(cache.update([rbSegment, rbSegmentWithInSegmentMatcher], [], 1)).toBe(true);
    expect(cache.get(rbSegment.name)).toEqual(rbSegment);
    expect(cache.get(rbSegmentWithInSegmentMatcher.name)).toEqual(rbSegmentWithInSegmentMatcher);
    expect(cache.getChangeNumber()).toBe(1);

    // Remove a segment
    expect(cache.update([], [rbSegment], 2)).toBe(true);
    expect(cache.get(rbSegment.name)).toBeNull();
    expect(cache.get(rbSegmentWithInSegmentMatcher.name)).toEqual(rbSegmentWithInSegmentMatcher);
    expect(cache.getChangeNumber()).toBe(2);

    // Remove remaining segment
    expect(cache.update([], [rbSegmentWithInSegmentMatcher], 3)).toBe(true);
    expect(cache.get(rbSegment.name)).toBeNull();
    expect(cache.get(rbSegmentWithInSegmentMatcher.name)).toBeNull();
    expect(cache.getChangeNumber()).toBe(3);

    // No changes
    expect(cache.update([], [rbSegmentWithInSegmentMatcher], 4)).toBe(false);
    expect(cache.getChangeNumber()).toBe(4);
  });

  test('contains should check for segment existence correctly', () => {
    cache.update([rbSegment, rbSegmentWithInSegmentMatcher], [], 1);

    expect(cache.contains(new Set())).toBe(true);
    expect(cache.contains(new Set([rbSegment.name]))).toBe(true);
    expect(cache.contains(new Set([rbSegment.name, rbSegmentWithInSegmentMatcher.name]))).toBe(true);
    expect(cache.contains(new Set(['nonexistent']))).toBe(false);
    expect(cache.contains(new Set([rbSegment.name, 'nonexistent']))).toBe(false);

    cache.update([], [rbSegment, rbSegmentWithInSegmentMatcher], 2);
  });

  test('usesSegments should track segments usage correctly', () => {
    expect(cache.usesSegments()).toBe(false); // No rbSegments, so false

    cache.update([rbSegment], [], 1); // rbSegment doesn't have IN_SEGMENT matcher
    expect(cache.usesSegments()).toBe(false);

    cache.update([rbSegmentWithInSegmentMatcher], [], 2); // rbSegmentWithInSegmentMatcher has IN_SEGMENT matcher
    expect(cache.usesSegments()).toBe(true);

    cache.clear();
    expect(cache.usesSegments()).toBe(false); // False after clear since there are no rbSegments
  });
});
