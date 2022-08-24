import { SplitKey, SplitKeyObject } from '../../types';
import { isObject } from '../lang';

// function isSplitKeyObject(key: any): key is SplitKeyObject {
//   return key !== undefined && key !== null && typeof key.matchingKey === 'string';
// }

// returns the matchingKey if the Key is defined as an object or the key itself if it is a string
export function getMatching(key?: SplitKey): string {
  return isObject(key) ? (key as SplitKeyObject).matchingKey : key as string;
}

// if the key is a string, there's no bucketingKey (undefined)
export function getBucketing(key: SplitKey): string | undefined {
  return isObject(key) ? (key as SplitKeyObject).bucketingKey : undefined;
}

/**
 * Verify type of key and return a valid object key used for get treatment for a
 * specific split.
 */
export function keyParser(key: SplitKey): SplitKeyObject {
  if (isObject(key)) {
    return {
      matchingKey: (key as SplitKeyObject).matchingKey,
      bucketingKey: (key as SplitKeyObject).bucketingKey
    };
  } else {
    return {
      matchingKey: key as string,
      bucketingKey: key as string
    };
  }
}
