/**
 * Base64 utils in pure JS, for browser, node and others which don't provide globals `btoa` and `atob`.
 * Implementation based on davidchambers/Base64 (https://github.com/davidchambers/Base64.js).

   Copyright 2019 David Chambers

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Decode a given string value in Base64 format
 *
 * @param {string} input value to decode
 */
export function decodeFromBase64(input: string): string {
  const str = (String(input)).replace(/[=]+$/, ''); // #31: ExtendScript bad parse of /=
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  let output = '';
  for (
    // initialize result and counters
    let bc = 0, bs, buffer, idx = 0;
    // get next character
    buffer = str.charAt(idx++); // eslint-disable-line no-cond-assign
    // character found in table? initialize bit storage and add its ascii value;
    // @ts-ignore
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    // try to find character in table (0-63, not found => -1)
    buffer = chars.indexOf(buffer);
  }
  return output;
}

/**
 * Encode a given string value to Base64 format.
 *
 * @param {string} input value to encode
 */
export function encodeToBase64(input: string): string {
  const str = String(input);
  let output = '';
  for (
    // initialize result and counter
    let block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    // @ts-ignore
    block = block << 8 | charCode;
  }
  return output;
}
