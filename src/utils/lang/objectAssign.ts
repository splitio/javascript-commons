/**
 * A tiny polyfill for Object.assign
 */

// https://www.npmjs.com/package/@types/object-assign
type ObjectAssign = (<T, U>(target: T, source: U) => T & U) &
  (<T, U, V>(target: T, source1: U, source2: V) => T & U & V) &
  (<T, U, V, W>(target: T, source1: U, source2: V, source3: W) => T & U & V & W) &
  (<T, U, V, W, Q>(target: T, source1: U, source2: V, source3: W, source4: Q) => T & U & V & W & Q) &
  (<T, U, V, W, Q, R>(target: T, source1: U, source2: V, source3: W, source4: Q, source5: R) => T & U & V & W & Q & R) &
  ((target: any, ...sources: any[]) => any);
export const objectAssign: ObjectAssign = Object.assign || function (target: any) {
  if (target === null || target === undefined) throw new TypeError('Object.assign cannot be called with null or undefined');
  target = Object(target);

  for (let i = 1; i < arguments.length; i++) {
    const source = Object(arguments[i]); // eslint-disable-next-line no-restricted-syntax
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};
