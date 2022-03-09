/**
 * Map implementation based on es6-map polyfill (https://github.com/medikoo/es6-map/blob/master/polyfill.js),
 * with the minimal features used by the SDK.

Copyright (C) 2013 Mariusz Nowak (www.medikoo.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
**/

export interface IMap<K, V> {
  set(key: K, value: V): this;
  clear(): void;
  delete(key: K): boolean;
  get(key: K): V | undefined;
  readonly size: number;
}

export class MapPoly<K, V> implements IMap<K, V>{
  private __mapKeysData__: K[] = [];
  private __mapValuesData__: V[] = [];

  // unlike ES6 `Map`, it only accepts an array as first argument iterable
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    if (Array.isArray(entries)) entries.forEach(entry => { this.set(entry[0], entry[1]); });
  }

  clear() {
    if (!this.__mapKeysData__.length) return;
    this.__mapKeysData__.length = 0;
    this.__mapValuesData__.length = 0;
  }

  set(key: K, value: V) {
    let index = this.__mapKeysData__.indexOf(key);
    if (index === -1) index = this.__mapKeysData__.push(key) - 1;
    this.__mapValuesData__[index] = value;
    return this;
  }

  delete(key: K) {
    const index = this.__mapKeysData__.indexOf(key);
    if (index === -1) return false;
    this.__mapKeysData__.splice(index, 1);
    this.__mapValuesData__.splice(index, 1);
    return true;
  }

  get(key: K) {
    const index = this.__mapKeysData__.indexOf(key);
    if (index === -1) return;
    return this.__mapValuesData__[index];
  }

  get size() {
    return this.__mapKeysData__.length;
  }

}

interface IMapConstructor {
  new(): IMap<any, any>;
  new <K, V>(entries?: readonly (readonly [K, V])[] | null): IMap<K, V>;
  readonly prototype: IMap<any, any>;
}

/**
 * return the Map constructor to use. If native Map is not available or it doesn't support the required features (e.g., IE11),
 * a ponyfill with minimal features is returned instead.
 *
 * Exported for testing purposes only.
 */
export function __getMapConstructor(): IMapConstructor {
  // eslint-disable-next-line compat/compat
  if (typeof Array.from === 'function' && typeof Map === 'function' && Map.prototype && Map.prototype.values) {
    return Map;
  }
  return MapPoly;
}

export const _Map = __getMapConstructor();
