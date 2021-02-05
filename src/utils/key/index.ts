import { SplitIO } from '../../types';
import { isObject } from '../lang';

// function isSplitKeyObject(key: any): key is SplitIO.SplitKeyObject {
//   return key !== undefined && key !== null && typeof key.matchingKey === 'string';
// }

// returns the matchingKey if the Key is defined as an object or the key itself if it is a string
export function getMatching(key: SplitIO.SplitKey): string {
  return isObject(key) ? (key as SplitIO.SplitKeyObject).matchingKey : key as string;
}

// if the key is a string, there's no bucketingKey (undefined)
export function getBucketing(key: SplitIO.SplitKey): string | undefined {
  return isObject(key) ? (key as SplitIO.SplitKeyObject).bucketingKey : undefined;
}

/**
 * Verify type of key and return a valid object key used for get treatment for a
 * specific split.
 */
export function keyParser(key: SplitIO.SplitKey): SplitIO.SplitKeyObject {
  if (isObject(key)) {
    return {
      matchingKey: (key as SplitIO.SplitKeyObject).matchingKey,
      bucketingKey: (key as SplitIO.SplitKeyObject).bucketingKey
    };
  } else {
    return {
      matchingKey: key as string,
      bucketingKey: key as string
    };
  }
}
