/**
 * Checks if the target string ends with the sub string.
 */
export function endsWith(target: any, sub: any, caseInsensitive = false): boolean {
  if (!(isString(target) && isString(sub))) {
    return false;
  }
  if (caseInsensitive) {
    target = target.toLowerCase();
    sub = sub.toLowerCase();
  }
  return target.slice(target.length - sub.length) === sub;
}

/**
 * Loops through a source collection (an object or an array) running iteratee
 * against each element. It returns the first element for which iteratee returned
 * a truthy value and stops the loop.
 * Iteratee receives three arguments (element, key/index, collection)
 */
export function find<T extends any[] | Record<string, any>, V = T extends any[] ? T[0] : T[keyof T], K = T extends any[] ? number : keyof T & string>(source: T | null | undefined, iteratee: (value: V, key: K, source: T) => boolean): V | undefined {
  let res;

  if (isObject(source)) {
    const keys = Object.keys(source as T);
    for (let i = 0; i < keys.length && !res; i++) {
      const key = keys[i];
      const iterateeResult = iteratee((source as Record<string, any>)[key], key as unknown as K, source as T);

      if (iterateeResult) res = (source as Record<string, V>)[key];
    }
  } else if (Array.isArray(source)) {
    for (let i = 0; i < (source as V[]).length && !res; i++) {
      const iterateeResult = iteratee(source[i], i as unknown as K, source);

      if (iterateeResult) res = source[i];
    }
  }

  return res;
}

/**
 * Evaluates iteratee for each element of the source array. Returns the index of the first element
 * for which iteratee returns truthy. If no element is found or there's an issue with the params it returns -1.
 */
export function findIndex<T>(source: T[], iteratee: (value: T, index: number, source: T[]) => boolean): number {
  if (Array.isArray(source) && typeof iteratee === 'function') {
    for (let i = 0; i < source.length; i++) {
      if (iteratee(source[i], i, source) === true) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Executes iteratee for given obj own props.
 */
export function forOwn<T>(obj: { [key: string]: T }, iteratee: (value: T, key: string, obj: { [key: string]: T }) => any): { [key: string]: T } {
  const keys = Object.keys(obj);

  keys.forEach(key => iteratee(obj[key], key, obj));

  return obj;
}

/**
 * Safely retrieve the specified prop from obj. If we can't retrieve
 * that property value, we return the default value.
 */
export function get(obj: any, prop: any, val?: any): any {
  let res = val;

  try { // No risks nor lots of checks.
    const pathPieces: string[] = prop.split('.');
    let partial: { [key: string]: any } = obj;
    pathPieces.forEach(pathPiece => partial = partial[pathPiece]);

    if (typeof partial !== 'undefined') res = partial;
  } catch (e) {
    // noop
  }
  return res;
}

/**
 * Parses an array into a map of different arrays, grouping by the specified prop value.
 */
export function groupBy<T extends Record<string, any>>(source: T[], prop: string): Record<string, T[]> {
  const map: Record<string, any[]> = {};

  if (Array.isArray(source) && isString(prop)) {
    for (let i = 0; i < source.length; i++) {
      const key = source[i][prop];

      // Skip the element if the key is not a string.
      if (isString(key)) {
        if (!map[key]) map[key] = [];

        map[key].push(source[i]);
      }
    }
  }

  return map;
}

/**
 * Checks if a given value is a boolean.
 */
export function isBoolean(val: any): boolean {
  return val === true || val === false;
}

/**
 * Checks if a given value is a finite value of number type or Number object.
 * Unlike `Number.isFinite`, it also tests Number object instances.
 * Unlike global `isFinite`, it returns false if the value is not a number or Number object instance.
 */
export function isFiniteNumber(val: any): boolean {
  if (val instanceof Number) val = val.valueOf();
  // @TODO remove `isFinite` once `Number.isFinite` is fully supported by targets
  // eslint-disable-next-line compat/compat
  if (typeof val === 'number') return Number.isFinite ? Number.isFinite(val) : isFinite(val);
  return false;
}

/**
 * Checks if a given value is an integer value of number type or Number object.
 * Unlike `Number.isInteger`, it also tests Number object instances.
 */
export function isIntegerNumber(val: any): boolean {
  if (val instanceof Number) val = val.valueOf();
  // eslint-disable-next-line compat/compat
  if (typeof val === 'number') return Number.isInteger ? Number.isInteger(val) : isFinite(val) && Math.floor(val) === val;
  return false;
}

/**
 * Checks if a given value is a NaN value of number type or Number object.
 * Unlike `Number.isNaN`, it also tests Number object instances.
 * Unlike global `isNan`, it returns false if the value is not a number or Number object instance.
 */
export function isNaNNumber(val: any): boolean {
  if (val instanceof Number) val = val.valueOf();
  // @TODO replace with `Number.isNaN` once it is fully supported by targets
  return val !== val;
}

/**
 * Validates if a value is an object created by the Object constructor (plain object).
 * It checks `constructor.name` to avoid false negatives when validating values on a separate VM context, which has its own global built-ins.
 */
export function isObject(obj: any) {
  return obj !== null && typeof obj === 'object' && (
    obj.constructor === Object ||
    (obj.constructor != null && obj.constructor.name === 'Object')
  );
}

/**
 * Checks if a given value is a string.
 */
export function isString(val: any): val is string {
  return typeof val === 'string' || val instanceof String;
}

/**
 * String sanitizer. Returns the provided value converted to uppercase if it is a string.
 */
export function stringToUpperCase(val: any) {
  return isString(val) ? val.toUpperCase() : val;
}

/**
 * Deep copy version of Object.assign using recursion.
 * There are some assumptions here. It's for internal use and we don't need verbose errors
 * or to ensure the data types or whatever. Parameters should always be correct (at least have a target and a source, of type object).
 */
export function merge(target: { [key: string]: any }, source: { [key: string]: any }, ...rest: any[]): object {
  let res = target;

  isObject(source) && Object.keys(source).forEach(key => {
    let val = source[key];

    if (isObject(val)) {
      if (res[key] && isObject(res[key])) { // If both are objects, merge into a new one.
        val = merge({}, res[key], val);
      } else { // else make a copy.
        val = merge({}, val);
      }
    }
    // We skip undefined values.
    if (val !== undefined) res[key] = val;
  });

  if (rest && rest.length) {
    const nextSource = rest.splice(0, 1)[0];
    res = merge(res, nextSource, ...rest);
  }

  return res;
}

/**
 * Checks if the target string starts with the sub string.
 */
export function startsWith(target: any, sub: any): boolean {
  if (!(isString(target) && isString(sub))) {
    return false;
  }
  return target.slice(0, sub.length) === sub;
}

/**
 * Transforms a value into a number.
 * Note: We're not expecting anything fancy here. If we are at some point, add more type checks.
 */
export function toNumber(val: any): number {
  if (typeof val === 'number') return val;

  if (isObject(val) && typeof val.valueOf === 'function') {
    const valOf = val.valueOf();
    val = isObject(valOf) ? valOf + '' : valOf;
  }

  if (typeof val !== 'string') {
    return val === 0 ? val : +val;
  }

  // Remove trailing whitespaces.
  val = val.replace(/^\s+|\s+$/g, '');

  return +val;
}

/**
 * Transforms a value into it's string representation.
 */
export function toString(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(val => isString(val) ? val : '') + '';

  let result = val + '';
  return (result === '0' && (1 / val) === Number.NEGATIVE_INFINITY) ? '-0' : result;
}
/**
 * Removes duplicate items on an array of strings.
 */
export function uniq(arr: string[]): string[] {
  const seen: Record<string, boolean> = {};
  return arr.filter(function (item) {
    return Object.prototype.hasOwnProperty.call(seen, item) ? false : seen[item] = true;
  });
}

/**
 * Removes duplicate items on an array of objects using an optional `stringify` function as equality criteria.
 * It uses JSON.stringify as default criteria.
 */
export function uniqAsStrings<T>(arr: T[], stringify: (value: T) => string = JSON.stringify): T[] {
  const seen: Record<string, boolean> = {};
  return arr.filter(function (item) {
    const itemString = stringify(item);
    return Object.prototype.hasOwnProperty.call(seen, itemString) ? false : seen[itemString] = true;
  });
}

let uniqueIdCounter = -1;

/**
 * Returns a number to be used as ID, which will be unique.
 */
export function uniqueId(): number {
  return uniqueIdCounter++;
}
