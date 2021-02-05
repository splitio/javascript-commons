import { __getSetConstructor, SetPoly } from '../sets';

test('__getSetConstructor', () => {

  // should return global Set constructor if available
  expect(__getSetConstructor()).toBe(global.Set);

  const originalSet = global.Set; // @ts-ignore
  global.Set = undefined; // overwrite global Set

  // should return Set polyfill if global Set constructor is not available
  expect(__getSetConstructor()).toBe(SetPoly);

  global.Set = originalSet; // restore original global Set

});
