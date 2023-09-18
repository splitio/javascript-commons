import { __getSetConstructor, _Set, returnSetsUnion, SetPoly } from '../sets';

test('__getSetConstructor', () => {

  // should return global Set constructor if available
  expect(__getSetConstructor()).toBe(global.Set);

  const originalSet = global.Set; // @ts-ignore
  global.Set = undefined; // overwrite global Set

  // should return Set polyfill if global Set constructor is not available
  expect(__getSetConstructor()).toBe(SetPoly);

  global.Set = originalSet; // restore original global Set

});

test('returnSetsUnion', () => {
  const set = new _Set(['1','2','3']);
  const set2 = new _Set(['4','5','6']);
  expect(returnSetsUnion(set, set2)).toEqual(new _Set(['1','2','3','4','5','6']));
  expect(set).toEqual(new _Set(['1','2','3']));
  expect(set2).toEqual(new _Set(['4','5','6']));

  const emptySet = new _Set([]);
  expect(returnSetsUnion(emptySet, emptySet)).toEqual(emptySet);
  expect(returnSetsUnion(set, emptySet)).toEqual(set);
  expect(returnSetsUnion(emptySet, set2)).toEqual(set2);
});
