// @ts-nocheck
import vm from 'vm';
import {
  startsWith,
  endsWith,
  get,
  findIndex,
  find,
  isString,
  isFiniteNumber,
  isNaNNumber,
  isIntegerNumber,
  isObject,
  uniqueId,
  merge,
  uniq,
  uniqAsStrings,
  toString,
  toNumber,
  forOwn,
  groupBy,
  isBoolean
} from '../index';
import { getFnName } from '../getFnName';
import { getGlobal } from '../getGlobal';
import { objectAssign } from '../objectAssign';

test('LANG UTILS / startsWith', () => {
  expect(startsWith('myStr', 'myS')).toBe(true);
  expect(startsWith('this is something', 'this is')).toBe(true);

  expect(startsWith('myStr', 'yS')).toBe(false);
  expect(startsWith(' myStr', 'yS')).toBe(false);
  expect(startsWith('myStr', ' yS')).toBe(false);
  expect(startsWith('myStr', null)).toBe(false);
  expect(startsWith(false, null)).toBe(false);
  expect(startsWith()).toBe(false);
  expect(startsWith(null, 'ys')).toBe(false);

});

test('LANG UTILS / endsWith', () => {
  expect(endsWith('myStr', 'Str')).toBe(true);
  expect(endsWith('myStr2', 'r2')).toBe(true);
  expect(endsWith('is a str', ' str', false)).toBe(true);

  // can be case insensitive too
  expect(endsWith('myStr', 'str', true)).toBe(true);
  expect(endsWith('myStr', 'str', true)).toBe(true);
  expect(endsWith('myStr', 'Str', true)).toBe(true);

  expect(endsWith('myStr', 'Sr')).toBe(false);
  expect(endsWith('myStr ', 'tr')).toBe(false);
  expect(endsWith('myStr', 'tr ')).toBe(false);
  expect(endsWith('myStr', 'str')).toBe(false);
  expect(endsWith('myStr', 'str', false)).toBe(false);
  expect(endsWith('myStr', null)).toBe(false);
  expect(endsWith(false, null)).toBe(false);
  expect(endsWith()).toBe(false);
  expect(endsWith(null, 'ys')).toBe(false);

});

test('LANG UTILS / get', () => {
  const obj = {
    simple: 'simple',
    undef: undefined,
    deepProp: {
      sample: 'sample',
      deeperProp: {
        deeper: true
      }
    }
  };

  // negative
  expect(get(obj, 'not_exists', 'default')).toBe('default'); // If the property path does not match a property of the source, return the default value.
  expect(get(obj, 'undef', 'default')).toBe('default'); // If the property is found but the value is undefined, return the default value.
  expect(get(obj, 'undef.crap', 'default')).toBe('default'); // If the property path is incorrect and could cause an error, return the default value.
  expect(get(obj, null, 'default')).toBe('default'); // If the property path is of wrong type, return the default value.
  expect(get(obj, /regex/, 'default')).toBe('default'); // If the property path is of wrong type, return the default value.
  expect(get(null, 'simple', 'default')).toBe('default'); // If the source is of wrong type, return the default value.
  expect(get(/regex/, 'simple', 'default')).toBe('default'); // If the source is of wrong type, return the default value.

  // positive
  expect(get(obj, 'simple', 'default')).toBe('simple'); // If the property path (regardless of how "deep") matches a defined property of the object, returns that value instead of default.
  expect(get(obj, 'deepProp.sample', 'default')).toBe('sample'); // If the property path (regardless of how "deep") matches a defined property of the object, returns that value instead of default.
  expect(get(obj, 'deepProp.deeperProp.deeper', 'default')).toBe(true); // If the property path (regardless of how "deep") matches a defined property of the object, returns that value instead of default.
  expect(get(obj, 'deepProp.deeperProp', 'default')).toEqual({ deeper: true }); // 'If the property path (regardless of how "deep") matches a defined property of the object, returns that value (regardless of the type) instead of default.');

});

test('LANG UTILS / getGlobal', () => {
  // positive
  expect(getGlobal('console')).toBe(console); // If the global property exists, return it.
  global.something = 'something';
  expect(getGlobal('something')).toBe('something'); // If the global property exists, return it.

  // negative
  expect(getGlobal()).toBe(undefined); expect(getGlobal(null)).toBe(undefined); // If the passed value is an invalid key type (neither a number or a string), return undefined.
  expect(getGlobal('non-existent-property')).toBe(undefined); // If the global property doesn't exist, return undefined.

});

test('LANG UTILS / findIndex', () => {
  const arr = [1, 2, 3, 4, 3];

  expect(findIndex()).toBe(-1); // If the parameters for findIndex are wrong it returns -1.
  expect(findIndex(null, () => { })).toBe(-1); // If the parameters for findIndex are wrong it returns -1.
  expect(findIndex({}, () => { })).toBe(-1); // If the parameters for findIndex are wrong it returns -1.
  expect(findIndex({}, false)).toBe(-1); // If the parameters for findIndex are wrong it returns -1.

  expect(findIndex(arr, () => false)).toBe(-1); // If no element causes iteratee to return truthy, it returns -1.
  expect(findIndex(arr, (e: any) => e === 5)).toBe(-1); // If no element causes iteratee to return truthy, it returns -1.

  expect(findIndex(arr, (e: any) => e === 1)).toBe(0); // It should return the index of the first element that causes iteratee to return truthy.
  expect(findIndex(arr, (e: any) => e === 2)).toBe(1); // It should return the index of the first element that causes iteratee to return truthy.
  expect(findIndex(arr, (e: any) => e === 3)).toBe(2); // It should return the index of the first element that causes iteratee to return truthy.

  /* Not testing the params received by iteratee because we know that Array.prototype.findIndex works ok */

});

test('LANG UTILS / find', () => {
  expect(find()).toBe(undefined); // We cant find the element if the collection is wrong type, so we return undefined.
  expect(find(null, () => true)).toBe(undefined); // We cant find the element if the collection is wrong type, so we return undefined.

  expect(find([], () => true)).toBe(undefined); // If the collection is empty there is no element to be found, so we return undefined.
  expect(find({}, () => true)).toBe(undefined); // If the collection is empty there is no element to be found, so we return undefined.

  const spy = jest.fn();
  const obj = { myKey: 'myVal', myOtherKey: 'myOtherVal' };

  find(obj, spy);
  expect(spy).toBeCalledTimes(2); // The iteratee should be called as many times as elements we have on the collection.
  expect(spy.mock.calls[0]).toEqual(['myVal', 'myKey', obj]); // When iterating on an object the iteratee should be called with (val, key, collection)
  expect(spy.mock.calls[1]).toEqual(['myOtherVal', 'myOtherKey', obj]); // When iterating on an object the iteratee should be called with (val, key, collection)

  const arr = ['one', 'two'];
  spy.mockClear();

  find(arr, spy);
  expect(spy).toBeCalledTimes(2); // The iteratee should be called as many times as elements we have on the collection.
  expect(spy.mock.calls[0]).toEqual(['one', 0, arr]); // When iterating on an array the iteratee should be called with (val, index, collection)
  expect(spy.mock.calls[1]).toEqual(['two', 1, arr]); // When iterating on an array the iteratee should be called with (val, index, collection)

  expect(find({ val1: '1', val2: '2' }, e => e === '2')).toBe('2'); // 'If an element causes iteratee to return a truthy value, that value is returned.');
  expect(find(['uno', 'dos'], e => e === 'uno')).toBe('uno'); // If an element causes iteratee to return a truthy value, that value is returned.

});

test('LANG UTILS / isString', () => {
  // positive
  expect(isString('')).toBe(true); // Should return true for strings.
  expect(isString('asd')).toBe(true); // Should return true for strings.
  expect(isString(new String('asdf'))).toBe(true); // Should return true for strings.

  // negative
  expect(isString()).toBe(false); // Should return false for non-strings.
  expect(isString(null)).toBe(false); // Should return false for non-strings.
  expect(isString([])).toBe(false); // Should return false for non-strings.
  expect(isString({})).toBe(false); // Should return false for non-strings.
  expect(isString(/regex/)).toBe(false); // Should return false for non-strings.

});

test('LANG UTILS / isFiniteNumber', () => {
  // positive
  expect(isFiniteNumber(1)).toBe(true); // Should return true for finite numbers.
  expect(isFiniteNumber(-0.5)).toBe(true); // Should return true for finite numbers.
  expect(isFiniteNumber(Number(0.5))).toBe(true); // Should return true for finite numbers.
  expect(isFiniteNumber(new Number(4))).toBe(true); // Should return true for finite numbers.

  // negative
  expect(isFiniteNumber()).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber(Infinity)).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber(-Infinity)).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber(NaN)).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber(new Number(Infinity))).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber(new Number(NaN))).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber(null)).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber([])).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber({})).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber(/regex/)).toBe(false); // Should return false for anything that is not a finite number.
  expect(isFiniteNumber('5')).toBe(false); // Should return false for anything that is not a finite number.

});

test('LANG UTILS / isNaNNumber', () => {
  // positive
  expect(isNaNNumber(NaN)).toBe(true); // Should return true for NaN numbers of "number" type.
  expect(isNaNNumber(Number(NaN))).toBe(true); // Should return true for NaN numbers of "number" type.
  expect(isNaNNumber(new Number(NaN))).toBe(true); // Should return true for NaN Number objects.

  // negative
  expect(isNaNNumber()).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber(Infinity)).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber(-Infinity)).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber(new Number(Infinity))).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber(null)).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber([])).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber({})).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber(/regex/)).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber('5')).toBe(false); // Should return false for anything that is not a NaN number.
  expect(isNaNNumber('NaN')).toBe(false); // Should return false for anything that is not a NaN number.

});

test('LANG UTILS / isIntegerNumber', () => {
  // positive
  expect(isIntegerNumber(1)).toBe(true); // Should return true for integer numbers of "number" type.
  expect(isIntegerNumber(Number.MIN_SAFE_INTEGER)).toBe(true); // Should return true for integer numbers of "number" type.
  expect(isIntegerNumber(Number(4))).toBe(true); // Should return true for integer numbers of "number" type.
  expect(isIntegerNumber(new Number(4))).toBe(true); // Should return true for integer Number objects.

  // negative
  expect(isIntegerNumber()).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(Infinity)).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(-Infinity)).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(NaN)).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(-0.5)).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(new Number(Infinity))).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(new Number(NaN))).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(new Number(-0.5))).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(null)).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber([])).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber({})).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber(/regex/)).toBe(false); // Should return false for anything that is not an integer numbers.
  expect(isIntegerNumber('5')).toBe(false); // Should return false for anything that is not an integer numbers.

});

test('LANG UTILS / isObject', () => {
  // positive
  expect(isObject({})).toBe(true); // Should return true for plain objects (objects created by the Object built-in constructor).
  expect(isObject({ a: true })).toBe(true); // Should return true for plain objects.
  expect(isObject(new Object())).toBe(true); // Should return true for plain objects.
  expect(isObject(Object.create({}))).toBe(true); // Should return true for plain objects.
  expect(isObject(Object.create(Object.prototype))).toBe(true); // Should return true for plain objects.

  // negative
  expect(isObject([])).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(() => { })).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(true)).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(false)).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(null)).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(undefined)).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(1)).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject('asd')).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(function () { })).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(Symbol('test'))).toBe(false); // Should return false for anything that is not a plain object.
  expect(isObject(new Promise(res => res()))).toBe(false); // Should return false for anything that is not a plain object.
  // Object.create(null) creates an object with no prototype which may be tricky to handle. Filtering that out too.
  expect(isObject(Object.create(null))).toBe(false); // Should return false for anything that is not a plain object.

  // validate on a different VM context
  const ctx = vm.createContext({ isObject });
  vm.runInContext('var plainObjectResult = isObject({}); var arrayResult = isObject([]); var nullResult = isObject(null);', ctx);
  expect(ctx.plainObjectResult).toBe(true);
  expect(ctx.arrayResult).toBe(false);
  expect(ctx.nullResult).toBe(false);
});

test('LANG UTILS / uniqueId', () => {
  let currId = -100;
  let prevId = -100;

  for (let i = 0; i < 10; i++) {
    currId = uniqueId();
    expect(prevId < currId).toBe(true); // Each time we call the function, the new ID should be different (greater than) the previous one.
    prevId = currId;
  }

});

test('LANG UTILS / merge', () => {
  let obj1: any = {};
  let res1 = merge(obj1, { something: 'else' });

  expect(res1 === obj1).toBe(true); // It merges on the target, modifying that object and returning it too.


  expect(merge({ a: 'a', b: 'b' }, { c: 'c' })).toEqual({ a: 'a', b: 'b', c: 'c' }); // Should be able to merge simple objects, an unlimited amount of them.
  expect(merge({ a: 'a', b: 'b' }, { c: 'c' }, { d: 'd' })).toEqual({ a: 'a', b: 'b', c: 'c', d: 'd' }); // Should be able to merge simple objects, an unlimited amount of them.
  expect(merge({ a: 'a' }, { b: 'b' }, { c: 'c' }, { d: 'd' })).toEqual({ a: 'a', b: 'b', c: 'c', d: 'd' }); // Should be able to merge simple objects, an unlimited amount of them.

  obj1 = {
    a: 'a',
    abc: { b: 'b', c: 'c' },
    arr: [1, 2]
  };
  let obj2: any = {
    a: 'not a anymore',
    d: 'd'
  };

  // Two objects with complex structures but not in common.
  expect(merge(obj1, obj2)).toEqual({
    a: 'not a anymore',
    abc: { b: 'b', c: 'c' },
    d: 'd',
    arr: [1, 2]
  }); // 'Should be able to merge complex objects');

  obj1 = {
    a: 'a',
    abc: { b: 'b', c: 'c' }
  };

  obj2 = {
    a: 'not a anymore',
    abc: { c: 'not c anymore', d: 'd' }
  };

  // Two objects with object property in common
  expect(merge(obj1, obj2)).toEqual({
    a: 'not a anymore',
    abc: { b: 'b', c: 'not c anymore', d: 'd' },
  }); // 'Should be able to merge complex objects');

  obj2.abc.d = { ran: 'dom' };

  // Two objects with object property in common and with objects in it.
  expect(merge(obj1, obj2)).toEqual({
    a: 'not a anymore',
    abc: { b: 'b', c: 'not c anymore', d: { ran: 'dom' } },
  }); // 'Should be able to merge complex objects');

  obj1.abc = 'abc';

  // Two objects with property in common, as object on source.
  expect(merge(obj1, obj2)).toEqual({
    a: 'not a anymore',
    abc: { c: 'not c anymore', d: { ran: 'dom' } }
  }); // 'Should be able to merge complex objects');

  obj1.abc = { a: 'obja', b: 'objb' };
  obj2.abc = 'str';

  // Two objects with property in common, as object on target. Source should always take precedence.
  expect(merge(obj1, obj2)).toEqual({
    a: 'not a anymore',
    abc: 'str'
  }); // 'Should be able to merge complex objects');

  obj1 = {
    1: '1',
    abc: { a: 'a', b: 'b' }
  };
  obj2 = {
    2: '2',
    abc: { a: 'a2', c: 'c' }
  };
  let obj3 = {
    3: '3',
    abc: { c: 'c3', d: { d: 'd' } },
    33: {
      3: 3
    }
  };

  // Three complex objects.
  expect(merge(obj1, obj2, obj3)).toEqual({
    1: '1', 2: '2', 3: '3', 33: { 3: 3 },
    abc: { a: 'a2', b: 'b', c: 'c3', d: { d: 'd' } }
  }); // 'Should be able to merge complex objects, an unlimited amount of them.');

  let obj4 = {
    33: {
      4: false
    }
  };
  delete obj2.abc; // This removes the reference.
  obj1.abc.a = 'a'; // Remember that it merges on the target.

  // Four complex objects, not all of them have the object prop.
  expect(merge(obj1, obj2, obj3, obj4)).toEqual({
    1: '1', 2: '2', 3: '3', 33: { 3: 3, 4: false },
    abc: { a: 'a', b: 'b', c: 'c3', d: { d: 'd' } }
  }); // 'Should be able to merge complex objects, an unlimited amount of them.');
  expect(obj1).toEqual({
    1: '1', 2: '2', 3: '3', 33: { 3: 3, 4: false },
    abc: { a: 'a', b: 'b', c: 'c3', d: { d: 'd' } }
  }); // 'Always modifying the target.');

  obj2.abc = undefined; // We should avoid undefined values.

  // Four complex objects, all of them have the object prop but one instead of object, undefined.
  expect(merge(obj1, obj2, obj3, obj4)).toEqual({
    1: '1', 2: '2', 3: '3', 33: { 3: 3, 4: false },
    abc: { a: 'a', b: 'b', c: 'c3', d: { d: 'd' } }
  }); // 'Should be able to merge complex objects, an unlimited amount of them and still filter undefined props.');

  res1 = {};
  expect(merge(res1, obj1) === res1).toBe(true); // Always returns the modified target.
  expect(res1).toEqual(obj1); // If target is an empty object, it will be a clone of the source on that one.

  const one = {};
  const two = {
    prop: 'val'
  };
  const three = {
    otherProp: 'val',
    objProp: { innerProp: true, innerObj: { deeperProp: 'test' } }
  };
  const four = {
    prop: 'val4'
  };

  const returnedObj: any = merge(one, two, three, four);

  expect(one).toBe(returnedObj); // The target object should be modified.
  expect(two).toEqual({ prop: 'val' }); // But no other objects sents as source should be modified.
  expect(three).toEqual({ otherProp: 'val', objProp: { innerProp: true, innerObj: { deeperProp: 'test' } } }); // But no other objects sents as source should be modified.
  expect(four).toEqual({ prop: 'val4' }); // But no other objects sents as source should be modified.

  expect(returnedObj.objProp).not.toBe(three.objProp); // Object properties should be clones of the value we had on source, not a reference.
  expect(returnedObj.objProp.innerObj).not.toBe(three.objProp.innerObj); // Object properties should be clones of the value we had on source, not a reference.

});

test('LANG UTILS / uniq', () => {
  expect(uniq(['1', '2', '1', '3', '3', '4', '3'])).toEqual(['1', '2', '3', '4']); // uniq should remove all duplicate strings from array.
  expect(uniq(['2', '2'])).toEqual(['2']); // uniq should remove all duplicate strings from array.
  expect(uniq(['2', '3'])).toEqual(['2', '3']); // uniq should remove all duplicate strings from array.
  expect(uniq(['3', '2', '3'])).toEqual(['3', '2']); // uniq should remove all duplicate strings from array.

});

test('LANG UTILS / uniqAsStrings', () => {
  // default JSON stringifier
  expect(uniqAsStrings([undefined, /^0/, null, 10, null, /^1/, undefined])).toEqual([undefined, /^0/, null, 10]); // uniqAsStrings should remove all duplicate values from array.
  expect(uniqAsStrings([1, 2, 1, 3, 3, 4, 3])).toEqual([1, 2, 3, 4]); // uniqAsStrings should remove all duplicate values from array.
  expect(uniqAsStrings([true, false, true, true])).toEqual([true, false]); // uniqAsStrings should remove all duplicate values from array.
  expect(uniqAsStrings(['3', '2', '3'])).toEqual(['3', '2']); // uniqAsStrings should remove all duplicate values from array.
  expect(uniqAsStrings(['2', '3'])).toEqual(['2', '3']); // uniqAsStrings should remove all duplicate values from array.
  expect(uniqAsStrings([{ a: '3' }, { a: '3', b: '2' }, { a: '3' }, { b: '2', a: '3' }])).toEqual([{ a: '3' }, { a: '3', b: '2' }, { b: '2', a: '3' }]); // uniqAsStrings should remove all duplicate values from array.

  // custom stringifier
  const stringifier = (value: any) => { return Object.keys(value).sort().join(','); }; // returns a string with the ordered keys of the passed object
  expect(uniqAsStrings([{ a: '3' }, { a: '3', b: '2' }, { a: '3' }, { b: '2', a: '3' }], stringifier)).toEqual([{ a: '3' }, { a: '3', b: '2' }]); // uniqAsStrings should remove all duplicate values from array.

  expect(() => { uniqAsStrings({}); }).toThrow(); // uniqAsStrings should be called with an array.

});

test('LANG UTILS / toString', () => {
  expect(typeof toString()).toBe('string'); // It should ALWAYS return a string.
  expect(typeof toString(null)).toBe('string'); // It should ALWAYS return a string.
  expect(typeof toString(250)).toBe('string'); // It should ALWAYS return a string.
  expect(typeof toString('asdad')).toBe('string'); // It should ALWAYS return a string.
  expect(typeof toString(/regex/)).toBe('string'); // It should ALWAYS return a string.

  expect(toString()).toBe(''); // And the returned string should be correct
  expect(toString('it is just me')).toBe('it is just me'); // And the returned string should be correct
  expect(toString(5)).toBe('5'); // And the returned string should be correct
  expect(toString(['str', /not_str/, 'secondStr'])).toBe('str,,secondStr'); // And the returned string should be correct
  expect(toString(0)).toBe('0'); // And the returned string should be correct
  expect(toString(-0)).toBe('-0'); // And the returned string should be correct
  expect(toString(-Infinity)).toBe('-Infinity'); // And the returned string should be correct

});

test('LANG UTILS / toNumber', () => {
  expect(typeof toNumber(NaN)).toBe('number'); // It should ALWAYS return a number.
  expect(typeof toNumber(null)).toBe('number'); // It should ALWAYS return a number.
  expect(typeof toNumber(250)).toBe('number'); // It should ALWAYS return a number.
  expect(typeof toNumber('asdad')).toBe('number'); // It should ALWAYS return a number.
  expect(typeof toNumber(/regex/)).toBe('number'); // It should ALWAYS return a number.

  expect(Number.isNaN(toNumber())).toBe(true); // The returned number should be NaN for values that cannot be converted
  expect(Number.isNaN(toNumber(/regex/))).toBe(true); // The returned number should be NaN for values that cannot be converted
  expect(Number.isNaN(toNumber({}))).toBe(true); // The returned number should be NaN for values that cannot be converted
  expect(Number.isNaN(toNumber({}))).toBe(true); // The returned number should be NaN for values that cannot be converted
  expect(Number.isNaN(toNumber('1.2.3'))).toBe(true); // The returned number should be NaN for values that cannot be converted

  expect(toNumber('1.2124')).toBe(1.2124); // The returned number (if it can be converted) should be correct
  expect(toNumber('238')).toBe(238); // The returned number (if it can be converted) should be correct
  expect(toNumber(null)).toBe(0); // The returned number (if it can be converted) should be correct
  expect(toNumber(15)).toBe(15); // The returned number (if it can be converted) should be correct
  expect(toNumber('')).toBe(0); // The returned number (if it can be converted) should be correct

});

test('LANG UTILS / forOwn', () => {
  const spy = jest.fn();
  const obj = { myKey: 'myVal', myOtherKey: 'myOtherVal' };

  forOwn(obj, spy);
  expect(spy).toBeCalledTimes(2); // The iteratee should be called as many times as elements we have on the object.
  expect(spy.mock.calls[0]).toEqual(['myVal', 'myKey', obj]); // When iterating on an object the iteratee should be called with (val, key, collection)
  expect(spy.mock.calls[1]).toEqual(['myOtherVal', 'myOtherKey', obj]); // When iterating on an object the iteratee should be called with (val, key, collection)

});

test('LANG UTILS / groupBy', () => {
  let arr = [{
    team: 'SDK',
    name: 'Nico',
    ex: 'glb'
  }, {
    team: 'SDK',
    name: 'Martin'
  }, {
    team: 'QA',
    name: 'Adrian',
    ex: 'glb'
  }];

  expect(groupBy(arr, 'team')).toEqual({
    SDK: [{ team: 'SDK', name: 'Nico', ex: 'glb' }, { team: 'SDK', name: 'Martin' }],
    QA: [{ team: 'QA', name: 'Adrian', ex: 'glb' }]
  }); // 'Should group by the property specified respecting the order of appearance.');
  expect(groupBy(arr, 'not_exist')).toEqual({}); // If the property specified does not exist on the elements the map will be empty.
  expect(groupBy(arr, 'ex')).toEqual({
    glb: [{ team: 'SDK', name: 'Nico', ex: 'glb' }, { team: 'QA', name: 'Adrian', ex: 'glb' }]
  }); // 'If the property specified does not exist on all the elements the ones without it will be skipped.');


  expect(groupBy([], 'team')).toEqual({}); // If the input is empty or wrong type, it will return an empty object.
  expect(groupBy(null, 'team')).toEqual({}); // If the input is empty or wrong type, it will return an empty object.
  expect(groupBy(undefined, 'team')).toEqual({}); // If the input is empty or wrong type, it will return an empty object.
  expect(groupBy(true, 'team')).toEqual({}); // If the input is empty or wrong type, it will return an empty object.
  expect(groupBy('string', 'team')).toEqual({}); // If the input is empty or wrong type, it will return an empty object.
  expect(groupBy({}, 'team')).toEqual({}); // If the input is empty or wrong type, it will return an empty object.
  expect(groupBy({ something: 1 }, null)).toEqual({}); // If the input is empty or wrong type, it will return an empty object.
  expect(groupBy({ something: 1 })).toEqual({}); // If the input is empty or wrong type, it will return an empty object.

});

test('LANG UTILS / getFnName', () => {
  function name1() { }

  expect(getFnName(name1)).toBe('name1'); // Should retrieve the function name.
  expect(getFnName(Array.prototype.push)).toBe('push'); // Should retrieve the function name.

});

test('LANG UTILS / objectAssign', () => {
  const toClone = {
    aProperty: 1,
    another: 'two',
    more: null,
    keys: [undefined, {}],
    innerObj: { test: true, deeper: { key: 'value' } },
    bool: true
  };

  const clone = objectAssign({}, toClone);

  expect(clone).toEqual(toClone); // The structure of the shallow clone should be the same since references are copied too.
  expect(clone).not.toBe(toClone); // But the reference to the object itself is differente since it is a clone
  expect(clone.innerObj).toBe(toClone.innerObj); // Internal references are just copied as references, since the clone is shallow.

});

test('LANG UTILS / isBoolean', () => {
  const notBool = [
    null, undefined, 0, 1, NaN, Infinity, function () { }, new Promise(() => { }), [], {}, 'true', 'false'
  ];

  // negatives
  notBool.forEach(val => expect(isBoolean(val)).toBe(false));
  // positives
  [true, false].forEach(val => expect(isBoolean(val)).toBe(true));

});
