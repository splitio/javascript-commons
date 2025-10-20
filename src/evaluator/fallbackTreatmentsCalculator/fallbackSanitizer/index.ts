import { FallbackTreatment } from '../../../../types/splitio';
import { FallbackDiscardReason } from '../constants';


export class FallbacksSanitizer {

  private static readonly pattern = /^[0-9]+[.a-zA-Z0-9_-]*$|^[a-zA-Z]+[a-zA-Z0-9_-]*$/;

  private static isValidFlagName(name: string): boolean {
    return name.length <= 100 && !name.includes(' ');
  }

  private static isValidTreatment(t?: string | FallbackTreatment): boolean {
    if (!t) {
      return false;
    }

    if (typeof t === 'string') {
      if (t.length > 100) {
        return false;
      }
      return this.pattern.test(t);
    }

    const { treatment } = t;
    if (!treatment || treatment.length > 100) {
      return false;
    }
    return this.pattern.test(treatment);
  }

  static sanitizeGlobal(treatment?: string | FallbackTreatment): string | FallbackTreatment | undefined {
    if (!this.isValidTreatment(treatment)) {
      console.error(
        `Fallback treatments - Discarded fallback: ${FallbackDiscardReason.Treatment}`
      );
      return undefined;
    }
    return treatment;
  }

  static sanitizeByFlag(
    byFlagFallbacks: Record<string, string | FallbackTreatment>
  ): Record<string, string | FallbackTreatment> {
    const sanitizedByFlag: Record<string, string | FallbackTreatment> = {};

    const entries = Object.entries(byFlagFallbacks);
    entries.forEach(([flag, t]) => {
      if (!this.isValidFlagName(flag)) {
        console.error(
          `Fallback treatments - Discarded flag '${flag}': ${FallbackDiscardReason.FlagName}`
        );
        return;
      }

      if (!this.isValidTreatment(t)) {
        console.error(
          `Fallback treatments - Discarded treatment for flag '${flag}': ${FallbackDiscardReason.Treatment}`
        );
        return;
      }

      sanitizedByFlag[flag] = t;
    });

    return sanitizedByFlag;
  }
}
