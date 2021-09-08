import { hash64 } from '../../../utils/murmur3/murmur3_64';
import { keylists, bitmaps } from '../AuthClient/__tests__/dataMocks';

import { parseKeyList, parseBitmap, isInBitmap } from '../mySegmentsV2utils';
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
      expect(removed.has(hash.dec)).toBe(false); // t belong to removed list
    });

    removedUserKeys.forEach(userKey => {
      const hash = hash64(userKey);
      expect(added.has(hash.dec)).toBe(false); // t belong to added list
      expect(removed.has(hash.dec)).toBe(true); // key hash belongs to removed list
    });

    otherUserKeys.forEach(userKey => {
      const hash = hash64(userKey);
      expect(added.has(hash.dec)).toBe(false); // t belong to added list
      expect(removed.has(hash.dec)).toBe(false); // t belong to removed list
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
      expect(isInBitmap(actualBitmap, hash.hex)).toBe(false); // t belong to Bitmap
    });
  });
});
