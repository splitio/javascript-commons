import { algorithms } from '../../utils/decompress';
import { decodeFromBase64 } from '../../utils/base64';
import { hash } from '../../utils/murmur3/murmur3';
import { Compression, IMembershipMSUpdateData, KeyList } from './SSEHandler/types';
import { IRBSegment, ISplit } from '../../dtos/types';

const GZIP = 1;
const ZLIB = 2;

function Uint8ArrayToString(myUint8Arr: Uint8Array) { // @ts-ignore
  return String.fromCharCode.apply(null, myUint8Arr);
}

function StringToUint8Array(myString: string) {
  const charCodes = myString.split('').map((e) => e.charCodeAt(0));
  return new Uint8Array(charCodes);
}

/**
 * Decode and decompress 'data' with 'compression' algorithm
 *
 * @param data - base64 encoded string
 * @param compression - 1 GZIP, 2 ZLIB
 * @returns
 * @throws if data string cannot be decoded, decompressed or the provided compression value is invalid (not 1 or 2)
 */
function decompress(data: string, compression: Compression) {
  let compressData = decodeFromBase64(data);
  const binData = StringToUint8Array(compressData);

  if (typeof algorithms === 'string') throw new Error(algorithms);
  if (compression === GZIP) return algorithms.gunzipSync(binData);
  if (compression === ZLIB) return algorithms.unzlibSync(binData);
  throw new Error(`Invalid compression algorithm #${compression}`);
}

/**
 * Decode, decompress and parse the provided 'data' into a KeyList object
 *
 * @param data - base64 encoded string
 * @param compression - 1 GZIP, 2 ZLIB
 * @param avoidPrecisionLoss - true as default, set it as false if dont need to avoid precission loss
 * @returns keyList
 * @throws if data string cannot be decoded, decompressed or parsed
 */
export function parseKeyList(data: string, compression: Compression, avoidPrecisionLoss = true): KeyList {
  const binKeyList = decompress(data, compression);
  let strKeyList = Uint8ArrayToString(binKeyList);
  // replace numbers to strings, to avoid losing precision
  if (avoidPrecisionLoss) strKeyList = strKeyList.replace(/\d+/g, '"$&"');
  return JSON.parse(strKeyList);
}

/**
 * Decode, decompress and parse the provided 'data' into a Bitmap object
 *
 * @param data - base64 encoded string
 * @param compression - 1 GZIP, 2 ZLIB
 * @returns Bitmap
 * @throws if data string cannot be decoded or decompressed
 */
export function parseBitmap(data: string, compression: Compression) {
  return decompress(data, compression);
}

/**
 * Check if the 'bitmap' bit at 'hash64hex' position is 1
 *
 * @param bitmap - Uint8Array bitmap
 * @param hash64hex - 16-chars string, representing a number in hexa
 * @returns whether the provided 'hash64hex' index is set in the bitmap
 */
export function isInBitmap(bitmap: Uint8Array, hash64hex: string) {
  // using the lowest 32 bits as index, to avoid losing precision when converting to number
  const index = parseInt(hash64hex.slice(8), 16) % (bitmap.length * 8);

  const internal = Math.floor(index / 8);
  const offset = index % 8;
  return (bitmap[internal] & 1 << offset) > 0;
}

/**
 * Parse feature flags notifications for instant feature flag updates
 */
export function parseFFUpdatePayload(compression: Compression, data: string): ISplit | IRBSegment | undefined {
  return compression > 0 ?
    parseKeyList(data, compression, false) :
    JSON.parse(decodeFromBase64(data));
}

const DEFAULT_MAX_INTERVAL = 60000;

export function getDelay(parsedData: Pick<IMembershipMSUpdateData, 'i' | 'h' | 's'>, matchingKey: string) {
  if (parsedData.h === 0) return 0;

  const interval = parsedData.i || DEFAULT_MAX_INTERVAL;
  const seed = parsedData.s || 0;

  return hash(matchingKey, seed) % interval;
}
