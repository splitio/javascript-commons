import { hash64 } from '../../../utils/murmur3/murmur3_64';
import { keylists, bitmaps, splitNotifications } from './dataMocks';

import { parseKeyList, parseBitmap, isInBitmap, parseFFUpdatePayload } from '../parseUtils';
import { _Set } from '../../../utils/lang/sets';
import { SPLIT_UPDATE } from '../types';

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

  let mockedNotification = {
    type: 'SPLIT_UPDATE' as SPLIT_UPDATE,
    changeNumber: 0,
    pcn: 0,
    d: '',
    c: 0,
  };

  splitNotifications.forEach(notification => {
    let { compression, data, decoded } = notification;
    mockedNotification.d = data;
    mockedNotification.c = compression;
    expect(parseFFUpdatePayload(mockedNotification)).toEqual(decoded); // decompress split notification
  });

});
