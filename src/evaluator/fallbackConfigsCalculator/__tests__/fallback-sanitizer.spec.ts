import { isValidConfigName, isValidConfig, sanitizeFallbacks } from '../fallbackSanitizer';
import SplitIO from '../../../../types/splitio';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

describe('FallbackConfigsSanitizer', () => {
  const validConfig: SplitIO.Config = { variant: 'on', value: { color: 'blue' } };
  const invalidVariantConfig: SplitIO.Config = { variant: ' ', value: { color: 'blue' } };
  const invalidValueConfig = { variant: 'on', value: 'not_an_object' } as unknown as SplitIO.Config;
  const fallbackMock = {
    global: undefined,
    byName: {}
  };

  beforeEach(() => {
    loggerMock.mockClear();
  });

  describe('isValidConfigName', () => {
    test('returns true for a valid config name', () => {
      expect(isValidConfigName('my_config')).toBe(true);
    });

    test('returns false for a name longer than 100 chars', () => {
      const longName = 'a'.repeat(101);
      expect(isValidConfigName(longName)).toBe(false);
    });

    test('returns false if the name contains spaces', () => {
      expect(isValidConfigName('invalid config')).toBe(false);
    });

    test('returns false if the name is not a string', () => {
      // @ts-ignore
      expect(isValidConfigName(true)).toBe(false);
    });
  });

  describe('isValidConfig', () => {
    test('returns true for a valid config', () => {
      expect(isValidConfig(validConfig)).toBe(true);
    });

    test('returns false for null or undefined', () => {
      expect(isValidConfig()).toBe(false);
      expect(isValidConfig(undefined)).toBe(false);
    });

    test('returns false for a variant longer than 100 chars', () => {
      const long: SplitIO.Config = { variant: 'a'.repeat(101), value: {} };
      expect(isValidConfig(long)).toBe(false);
    });

    test('returns false if variant does not match regex pattern', () => {
      const invalid: SplitIO.Config = { variant: 'invalid variant!', value: {} };
      expect(isValidConfig(invalid)).toBe(false);
    });

    test('returns false if value is not an object', () => {
      expect(isValidConfig(invalidValueConfig)).toBe(false);
    });
  });

  describe('sanitizeGlobal', () => {
    test('returns the config if valid', () => {
      expect(sanitizeFallbacks(loggerMock, { ...fallbackMock, global: validConfig })).toEqual({ ...fallbackMock, global: validConfig });
      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('returns undefined and logs error if variant is invalid', () => {
      const result = sanitizeFallbacks(loggerMock, { ...fallbackMock, global: invalidVariantConfig });
      expect(result).toEqual(fallbackMock);
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Fallback configs - Discarded fallback')
      );
    });

    test('returns undefined and logs error if value is invalid', () => {
      const result = sanitizeFallbacks(loggerMock, { ...fallbackMock, global: invalidValueConfig });
      expect(result).toEqual(fallbackMock);
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Fallback configs - Discarded fallback')
      );
    });
  });

  describe('sanitizeByName', () => {
    test('returns a sanitized map with valid entries only', () => {
      const input = {
        valid_config: validConfig,
        'invalid config': validConfig,
        bad_variant: invalidVariantConfig,
      };

      const result = sanitizeFallbacks(loggerMock, { ...fallbackMock, byName: input });

      expect(result).toEqual({ ...fallbackMock, byName: { valid_config: validConfig } });
      expect(loggerMock.error).toHaveBeenCalledTimes(2); // invalid config name + bad_variant
    });

    test('returns empty object if all invalid', () => {
      const input = {
        'invalid config': invalidVariantConfig,
      };

      const result = sanitizeFallbacks(loggerMock, { ...fallbackMock, byName: input });
      expect(result).toEqual(fallbackMock);
      expect(loggerMock.error).toHaveBeenCalled();
    });

    test('returns same object if all valid', () => {
      const input = {
        ...fallbackMock,
        byName: {
          config_one: validConfig,
          config_two: { variant: 'valid_2', value: { key: 'val' } },
        }
      };

      const result = sanitizeFallbacks(loggerMock, input);
      expect(result).toEqual(input);
      expect(loggerMock.error).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeFallbacks', () => {
    test('returns undefined and logs error if fallbacks is not an object', () => { // @ts-expect-error
      const result = sanitizeFallbacks(loggerMock, 'invalid_fallbacks');
      expect(result).toBeUndefined();
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Fallback configs - Discarded configuration: it must be an object with optional `global` and `byName` properties'
      );
    });

    test('returns undefined and logs error if fallbacks is not an object', () => { // @ts-expect-error
      const result = sanitizeFallbacks(loggerMock, true);
      expect(result).toBeUndefined();
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Fallback configs - Discarded configuration: it must be an object with optional `global` and `byName` properties'
      );
    });

    test('sanitizes both global and byName fallbacks for empty object', () => { // @ts-expect-error
      const result = sanitizeFallbacks(loggerMock, { global: {} });
      expect(result).toEqual({ global: undefined, byName: {} });
    });
  });
});
