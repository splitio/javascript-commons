import { returnSetsUnion, returnDifference } from '../sets';

test('returnSetsUnion', () => {
  const set = new Set(['1', '2', '3', '4']);
  const set2 = new Set(['4', '5', '6', '1']);
  expect(returnSetsUnion(set, set2)).toEqual(new Set(['1', '2', '3', '4', '5', '6']));
  expect(set).toEqual(new Set(['1', '2', '3', '4']));
  expect(set2).toEqual(new Set(['4', '5', '6', '1']));

  const emptySet = new Set([]);
  expect(returnSetsUnion(emptySet, emptySet)).toEqual(emptySet);
  expect(returnSetsUnion(set, emptySet)).toEqual(set);
  expect(returnSetsUnion(emptySet, set2)).toEqual(set2);
});

test('returnDifference', () => {
  const list = ['1', '2', '3'];
  const list2 = ['2', '3', '4'];
  expect(returnDifference(list, list2)).toEqual(['1']);
  expect(list).toEqual(['1', '2', '3']);
  expect(list2).toEqual(['2', '3', '4']);

  expect(returnDifference([], [])).toEqual([]);
  expect(returnDifference(list, [])).toEqual(list);
  expect(returnDifference([], list2)).toEqual([]);
});
