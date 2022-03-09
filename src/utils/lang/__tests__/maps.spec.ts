import { __getMapConstructor, MapPoly } from '../maps';

test('__getMapConstructor', () => {

  // should return global Map constructor if available
  expect(__getMapConstructor()).toBe(global.Map);

  const originalMap = global.Map; // @ts-ignore
  global.Map = undefined; // overwrite global Map

  // should return Map polyfill if global Map constructor is not available
  expect(__getMapConstructor()).toBe(MapPoly);

  global.Map = originalMap; // restore original global Map

});
