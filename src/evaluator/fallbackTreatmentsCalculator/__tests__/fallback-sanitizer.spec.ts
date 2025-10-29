import { isValidFlagName, isValidTreatment, sanitizeFallbacks } from '../fallbackSanitizer';
import { TreatmentWithConfig } from '../../../../types/splitio';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

describe('FallbacksSanitizer', () => {
  const validTreatment: TreatmentWithConfig = { treatment: 'on', config: '{"color":"blue"}' };
  const invalidTreatment: TreatmentWithConfig = { treatment: ' ', config: null };
  const fallbackMock = {
    global: undefined,
    byFlag: {}
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (loggerMock.error as jest.Mock).mockRestore();
  });

  describe('isValidFlagName', () => {
    test('returns true for a valid flag name', () => {
      // @ts-expect-private-access
      expect(isValidFlagName('my_flag')).toBe(true);
    });

    test('returns false for a name longer than 100 chars', () => {
      const longName = 'a'.repeat(101);
      expect(isValidFlagName(longName)).toBe(false);
    });

    test('returns false if the name contains spaces', () => {
      expect(isValidFlagName('invalid flag')).toBe(false);
    });

    test('returns false if the name contains spaces', () => {
      // @ts-ignore
      expect(isValidFlagName(true)).toBe(false);
    });
  });

  describe('isValidTreatment', () => {
    test('returns true for a valid treatment string', () => {
      expect(isValidTreatment(validTreatment)).toBe(true);
    });

    test('returns false for null or undefined', () => {
      expect(isValidTreatment()).toBe(false);
      expect(isValidTreatment(undefined)).toBe(false);
    });

    test('returns false for a treatment longer than 100 chars', () => {
      const long = { treatment: 'a'.repeat(101), config: null };
      expect(isValidTreatment(long)).toBe(false);
    });

    test('returns false if treatment does not match regex pattern', () => {
      const invalid = { treatment: 'invalid treatment!', config: null };
      expect(isValidTreatment(invalid)).toBe(false);
    });
  });

  describe('sanitizeGlobal', () => {
    test('returns the treatment if valid', () => {
      expect(sanitizeFallbacks(loggerMock, { ...fallbackMock, global: validTreatment })).toEqual({ ...fallbackMock, global: validTreatment });
      expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('returns undefined and logs error if invalid', () => {
      const result = sanitizeFallbacks(loggerMock, { ...fallbackMock, global: invalidTreatment });
      expect(result).toEqual(fallbackMock);
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Fallback treatments - Discarded fallback')
      );
    });
  });

  describe('sanitizeByFlag', () => {
    test('returns a sanitized map with valid entries only', () => {
      const input = {
        valid_flag: validTreatment,
        'invalid flag': validTreatment,
        bad_treatment: invalidTreatment,
      };

      const result = sanitizeFallbacks(loggerMock, {...fallbackMock, byFlag: input});

      expect(result).toEqual({ ...fallbackMock, byFlag: { valid_flag: validTreatment } });
      expect(loggerMock.error).toHaveBeenCalledTimes(2); // invalid flag + bad_treatment
    });

    test('returns empty object if all invalid', () => {
      const input = {
        'invalid flag': invalidTreatment,
      };

      const result = sanitizeFallbacks(loggerMock, {...fallbackMock, byFlag: input});
      expect(result).toEqual(fallbackMock);
      expect(loggerMock.error).toHaveBeenCalled();
    });

    test('returns same object if all valid', () => {
      const input = {
        ...fallbackMock,
        byFlag:{
          flag_one: validTreatment,
          flag_two: { treatment: 'valid_2', config: null },
        }
      };

      const result = sanitizeFallbacks(loggerMock, input);
      expect(result).toEqual(input);
      expect(loggerMock.error).not.toHaveBeenCalled();
    });
  });
  describe('sanitizeFallbacks', () => {
    test('returns undefined and logs error if fallbacks is not an object', () => {
      const result = sanitizeFallbacks(loggerMock, 'invalid_fallbacks');
      expect(result).toBeUndefined();
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Fallback treatments - Discarded configuration: it must be an object with optional `global` and `byFlag` properties'
      );
    });

    test('returns undefined and logs error if fallbacks is not an object', () => {
      const result = sanitizeFallbacks(loggerMock, true);
      expect(result).toBeUndefined();
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Fallback treatments - Discarded configuration: it must be an object with optional `global` and `byFlag` properties'
      );
    });

    test('sanitizes both global and byFlag fallbacks for empty object', () => {
      const result = sanitizeFallbacks(loggerMock, { global: {} });
      expect(result).toEqual({ global: undefined, byFlag: {} });
    });
  });
});
