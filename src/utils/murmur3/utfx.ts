/*
 Trimmed version of "utfx" library (https://www.npmjs.com/package/utfx/v/1.0.1) used to encode,
 decode and convert UTF8 / UTF16 in JavaScript, with the minimal methods used by the SDK.

 utfx (c) 2014 Daniel Wirtz <dcode@dcode.io>
 Released under the Apache License, Version 2.0
 see: https://github.com/dcodeIO/utfx for details
*/

export interface utfx {
  encodeUTF16toUTF8(src: () => number | null, dst: (...args: number[]) => string | undefined): void
}


/**
 * Encodes UTF8 code points to UTF8 bytes.
 * @param src - Code points source, either as a function returning the next code point
 *  respectively `null` if there are no more code points left or a single numeric code point.
 * @param dst - Bytes destination as a function successively called with the next byte
 */
function encodeUTF8(src: (() => number | null) | number, dst: (cp: number) => void): void {
  var cp = null;
  if (typeof src === 'number')
    cp = src, src = function () { return null; };
  while (cp !== null || (cp = src()) !== null) {
    if (cp < 0x80)
      dst(cp & 0x7F);
    else if (cp < 0x800)
      dst(((cp >> 6) & 0x1F) | 0xC0), dst((cp & 0x3F) | 0x80);
    else if (cp < 0x10000)
      dst(((cp >> 12) & 0x0F) | 0xE0), dst(((cp >> 6) & 0x3F) | 0x80), dst((cp & 0x3F) | 0x80);
    else
      dst(((cp >> 18) & 0x07) | 0xF0), dst(((cp >> 12) & 0x3F) | 0x80), dst(((cp >> 6) & 0x3F) | 0x80), dst((cp & 0x3F) | 0x80);
    cp = null;
  }
}

/**
 * Converts UTF16 characters to UTF8 code points.
 * @param src - Characters source as a function returning the next char code respectively
 *  `null` if there are no more characters left.
 * @param dst - Code points destination as a function successively called with each converted code
 *  point.
 */
function UTF16toUTF8(src: () => number | null, dst: (cp: number) => void): void {
  var c1, c2 = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if ((c1 = c2 !== null ? c2 : src()) === null)
      break;
    if (c1 >= 0xD800 && c1 <= 0xDFFF) {
      if ((c2 = src()) !== null) {
        if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
          dst((c1 - 0xD800) * 0x400 + c2 - 0xDC00 + 0x10000);
          c2 = null; continue;
        }
      }
    }
    dst(c1);
  }
  if (c2 !== null) dst(c2);
}

/**
 * Converts and encodes UTF16 characters to UTF8 bytes.
 * @param src - Characters source as a function returning the next char code respectively `null`
 *  if there are no more characters left.
 * @param dst - Bytes destination as a function successively called with the next byte.
 */
export function encodeUTF16toUTF8(src: () => number | null, dst: (...args: number[]) => string | undefined): void {
  UTF16toUTF8(src, function (cp) {
    encodeUTF8(cp, dst);
  });
}

/**
 * String.fromCharCode reference for compile time renaming.
 */
var stringFromCharCode = String.fromCharCode;

/**
 * Creates a source function for a string.
 * @param s - String to read from
 * @returns Source function returning the next char code respectively `null` if there are
 *  no more characters left.
 * @throws If the argument is invalid
 */
export function stringSource(s: string): () => number | null {
  if (typeof s !== 'string')
    throw TypeError('Illegal argument: ' + (typeof s));
  var i = 0; return function () {
    return i >= s.length ? null : s.charCodeAt(i++);
  };
}

/**
 * Creates a destination function for a string.
 * @returns Destination function successively called with the next char code.
 *  Returns the final string when called without arguments.
 */
export function stringDestination(): (...args: number[]) => string | undefined {
  const cs: number[] = [], ps: string[] = []; return function () {
    if (arguments.length === 0)
      return ps.join('') + stringFromCharCode.apply(String, cs);
    if (cs.length + arguments.length > 1024)
      ps.push(stringFromCharCode.apply(String, cs)), cs.length = 0; // @ts-ignore
    Array.prototype.push.apply(cs, arguments);
  };
}
