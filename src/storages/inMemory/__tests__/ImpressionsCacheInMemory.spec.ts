
import ImpressionsCache from '../ImpressionsCacheInMemory';

test('IMPRESSIONS CACHE IN MEMORY / should incrementally store values', () => {
  const c = new ImpressionsCache();

  // @ts-expect-error
  c.track([0]); // @ts-expect-error
  c.track([1, 2]); // @ts-expect-error
  c.track([3]);

  expect(c.state()).toEqual([0, 1, 2, 3]); // all the items should be stored in sequential order
});
