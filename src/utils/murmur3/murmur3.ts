/* eslint-disable no-fallthrough */
import { UTF16ToUTF8, x86Fmix, x86Multiply, x86Rotl } from './common';

/*
 * +----------------------------------------------------------------------------------+
 * | murmurHash3.js v3.0.0 (http://github.com/karanlyons/murmurHash3.js)              |
 * | A TypeScript/JavaScript implementation of MurmurHash3's hashing algorithms.      |
 * |----------------------------------------------------------------------------------|
 * | Copyright (c) 2012-2020 Karan Lyons. Freely distributable under the MIT license. |
 * +----------------------------------------------------------------------------------+
 */

// PUBLIC FUNCTIONS
// ----------------
function hash32(key?: string, seed?: number) {
  //
  // Given a string and an optional seed as an int, returns a 32 bit hash
  // using the x86 flavor of MurmurHash3, as an unsigned int.
  //

  key = key || '';
  seed = seed || 0;

  var remainder = key.length % 4;
  var bytes = key.length - remainder;

  var h1 = seed;

  var k1 = 0;

  var c1 = 0xcc9e2d51;
  var c2 = 0x1b873593;

  for (var i = 0; i < bytes; i = i + 4) {
    k1 = ((key.charCodeAt(i) & 0xff)) | ((key.charCodeAt(i + 1) & 0xff) << 8) | ((key.charCodeAt(i + 2) & 0xff) << 16) | ((key.charCodeAt(i + 3) & 0xff) << 24);

    k1 = x86Multiply(k1, c1);
    k1 = x86Rotl(k1, 15);
    k1 = x86Multiply(k1, c2);

    h1 ^= k1;
    h1 = x86Rotl(h1, 13);
    h1 = x86Multiply(h1, 5) + 0xe6546b64;
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;

    case 1:
      k1 ^= (key.charCodeAt(i) & 0xff);
      k1 = x86Multiply(k1, c1);
      k1 = x86Rotl(k1, 15);
      k1 = x86Multiply(k1, c2);
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 = x86Fmix(h1);

  return h1 >>> 0;
}

export function hash(str: string, seed?: number): number {
  return hash32(UTF16ToUTF8(str), seed as number >>> 0);
}

export function bucket(str: string, seed?: number): number {
  return Math.abs(hash(str, seed) % 100) + 1;
}
