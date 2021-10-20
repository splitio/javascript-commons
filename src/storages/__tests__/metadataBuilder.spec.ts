import { metadataBuilder } from '../metadataBuilder';
import { UNKNOWN } from '../../utils/constants';

describe('metadataBuilder', () => {

  test('metadata object creation', () => {
    const settings = {
      version: 'test.version',
      runtime: {
        ip: 'test.ip',
        hostname: 'test.hostname'
      }
    };
    let meta = metadataBuilder(settings);

    expect(meta.s).toBe(settings.version); // SDK Version should be returned as the "s" property.
    expect(meta.i).toBe(settings.runtime.ip); // SDK runtime IP should be returned as the "i" property.
    expect(meta.n).toBe(settings.runtime.hostname); // SDK runtime hostname should be returned as the "n" property.

    expect(meta !== metadataBuilder(settings)).toBe(true); // Should return a new object each time we call it.
  });

  test('creation with undefined properties', () => {
    const fakeSettings = {
      version: 'test.version', runtime: { ip: false as false, hostname: false as false }
    };
    let meta = metadataBuilder(fakeSettings);

    expect(meta.s).toBe(fakeSettings.version); // SDK Version should be returned as the "s" property.
    expect(meta.i).toBe(UNKNOWN); // The "i" property should be 'UNKNOWN' if IP value is undefined.
    expect(meta.n).toBe(UNKNOWN); // The "n" property should be 'UNKNOWN' if hostname value is undefined.
  });

});
