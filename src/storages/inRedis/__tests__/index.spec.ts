import { metadataBuilder } from '../index';
import { UNKNOWN } from '../../../utils/constants';
import { IMetadata } from '../../../dtos/types';

describe('metadataBuilder', () => {

  test('metadata object creation', () => {
    const metadata = {
      version: 'test.version',
      ip: 'test.ip',
      hostname: 'test.hostname'
    };
    let meta = metadataBuilder(metadata);

    expect(meta.s).toBe(metadata.version); // SDK Version should be returned as the "s" property.
    expect(meta.i).toBe(metadata.ip); // SDK runtime IP should be returned as the "i" property.
    expect(meta.n).toBe(metadata.hostname); // SDK runtime hostname should be returned as the "n" property.

    expect(meta !== metadataBuilder(metadata)).toBe(true); // Should return a new object each time we call it.
  });

  test('creation with undefined properties', () => {
    const metadata: IMetadata = {
      version: 'test.version', ip: false, hostname: false
    };
    let meta = metadataBuilder(metadata);

    expect(meta.s).toBe(metadata.version); // SDK Version should be returned as the "s" property.
    expect(meta.i).toBe(UNKNOWN); // The "i" property should be 'UNKNOWN' if IP value is undefined.
    expect(meta.n).toBe(UNKNOWN); // The "n" property should be 'UNKNOWN' if hostname value is undefined.
  });

});
