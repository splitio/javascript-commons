import { hash64 } from '../../../utils/murmur3/murmur3_64';
import { keylists, bitmaps, splitNotifications } from './dataMocks';

import { parseKeyList, parseBitmap, isInBitmap, parseFFUpdatePayload, getDelay } from '../parseUtils';
import { _Set } from '../../../utils/lang/sets';

test('parseKeyList', () => {
  keylists.forEach(keylist => {
    const { compression, keyListData, keyListDataCompressed, addedUserKeys, removedUserKeys, otherUserKeys } = keylist;

    expect(parseKeyList(keyListDataCompressed, compression)).toEqual(keyListData); // decompress KeyList

    const added = new _Set(keyListData.a);
    const removed = new _Set(keyListData.r);

    addedUserKeys.forEach(userKey => {
      const hash = hash64(userKey);
      expect(added.has(hash.dec)).toBe(true); // key hash belongs to added list
      expect(removed.has(hash.dec)).toBe(false); // key hash doesn\'t belong to removed list
    });

    removedUserKeys.forEach(userKey => {
      const hash = hash64(userKey);
      expect(added.has(hash.dec)).toBe(false); // key hash doesn\'t belong to added list
      expect(removed.has(hash.dec)).toBe(true); // key hash belongs to removed list
    });

    otherUserKeys.forEach(userKey => {
      const hash = hash64(userKey);
      expect(added.has(hash.dec)).toBe(false); // key hash doesn\'t belong to added list
      expect(removed.has(hash.dec)).toBe(false); // key hash doesn\'t belong to removed list
    });
  });
});

test('parseBitmap & isInBitmap', () => {
  bitmaps.forEach(bitmap => {
    const { compression, bitmapData, bitmapDataCompressed, trueUserKeys, falseUserKeys } = bitmap;

    const actualBitmap = parseBitmap(bitmapDataCompressed, compression);
    if (bitmapData) expect(actualBitmap).toEqual(bitmapData); // decompress Bitmap

    trueUserKeys.forEach(userKey => {
      const hash = hash64(userKey);
      expect(isInBitmap(actualBitmap, hash.hex)).toBe(true); // key hash belongs to Bitmap
    });

    falseUserKeys.forEach(userKey => {
      const hash = hash64(userKey);
      expect(isInBitmap(actualBitmap, hash.hex)).toBe(false); // key hash doesn\'t belong to Bitmap
    });
  });
});

test('split notification - parseKeyList', () => {

  splitNotifications.forEach(notification => {
    let { compression, data, decoded } = notification;
    expect(parseFFUpdatePayload(compression, data)).toEqual(decoded); // decompress split notification
  });

});

test('getDelay', () => {
  // if h === 0, return 0 (immediate, no delay)
  expect(getDelay({ i: 300, h: 0, s: 1 }, 'anything')).toBe(0);

  // if h !== 0, calculate delay with provided hash, seed and interval
  expect(getDelay({ i: 300, h: 1, s: 0 }, 'nicolas@split.io')).toBe(241);
  expect(getDelay({ i: 60000, h: 1, s: 1 }, 'emi@split.io')).toBe(14389);
  expect(getDelay({ i: 60000, h: 1, s: 0 }, 'emi@split.io')).toBe(24593);

  // if i, h and s are not provided, use defaults
  expect(getDelay({}, 'emi@split.io')).toBe(24593);
});
