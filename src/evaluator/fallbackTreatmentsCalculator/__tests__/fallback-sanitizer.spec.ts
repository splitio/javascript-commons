import { FallbacksSanitizer } from '../fallbackSanitizer';
import { TreatmentWithConfig } from '../../../../types/splitio';

describe('FallbacksSanitizer', () => {
  const validTreatment: TreatmentWithConfig = { treatment: 'on', config: '{"color":"blue"}' };
  const invalidTreatment: TreatmentWithConfig = { treatment: ' ', config: null };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('isValidFlagName', () => {
    test('returns true for a valid flag name', () => {
      // @ts-expect-private-access
      expect((FallbacksSanitizer as any).isValidFlagName('my_flag')).toBe(true);
    });

    test('returns false for a name longer than 100 chars', () => {
      const longName = 'a'.repeat(101);
      expect((FallbacksSanitizer as any).isValidFlagName(longName)).toBe(false);
    });

    test('returns false if the name contains spaces', () => {
      expect((FallbacksSanitizer as any).isValidFlagName('invalid flag')).toBe(false);
    });
  });

  describe('isValidTreatment', () => {
    test('returns true for a valid treatment string', () => {
      expect((FallbacksSanitizer as any).isValidTreatment(validTreatment)).toBe(true);
    });

    test('returns false for null or undefined', () => {
      expect((FallbacksSanitizer as any).isValidTreatment(null)).toBe(false);
      expect((FallbacksSanitizer as any).isValidTreatment(undefined)).toBe(false);
    });

    test('returns false for a treatment longer than 100 chars', () => {
      const long = { treatment: 'a'.repeat(101) };
      expect((FallbacksSanitizer as any).isValidTreatment(long)).toBe(false);
    });

    test('returns false if treatment does not match regex pattern', () => {
      const invalid = { treatment: 'invalid treatment!' };
      expect((FallbacksSanitizer as any).isValidTreatment(invalid)).toBe(false);
    });
  });

  describe('sanitizeGlobal', () => {
    test('returns the treatment if valid', () => {
      expect(FallbacksSanitizer.sanitizeGlobal(validTreatment)).toEqual(validTreatment);
      expect(console.error).not.toHaveBeenCalled();
    });

    test('returns undefined and logs error if invalid', () => {
      const result = FallbacksSanitizer.sanitizeGlobal(invalidTreatment);
      expect(result).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
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

      const result = FallbacksSanitizer.sanitizeByFlag(input);

      expect(result).toEqual({ valid_flag: validTreatment });
      expect(console.error).toHaveBeenCalledTimes(2); // invalid flag + bad_treatment
    });

    test('returns empty object if all invalid', () => {
      const input = {
        'invalid flag': invalidTreatment,
      };

      const result = FallbacksSanitizer.sanitizeByFlag(input);
      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalled();
    });

    test('returns same object if all valid', () => {
      const input = {
        flag_one: validTreatment,
        flag_two: { treatment: 'valid_2', config: null },
      };

      const result = FallbacksSanitizer.sanitizeByFlag(input);
      expect(result).toEqual(input);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
