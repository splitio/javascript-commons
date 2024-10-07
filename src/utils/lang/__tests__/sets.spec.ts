import { returnSetsUnion } from '../sets';

test('returnSetsUnion', () => {
  const set = new Set(['1', '2', '3']);
  const set2 = new Set(['4', '5', '6']);
  expect(returnSetsUnion(set, set2)).toEqual(new Set(['1', '2', '3', '4', '5', '6']));
  expect(set).toEqual(new Set(['1', '2', '3']));
  expect(set2).toEqual(new Set(['4', '5', '6']));

  const emptySet = new Set([]);
  expect(returnSetsUnion(emptySet, emptySet)).toEqual(emptySet);
  expect(returnSetsUnion(set, emptySet)).toEqual(set);
  expect(returnSetsUnion(emptySet, set2)).toEqual(set2);
});
