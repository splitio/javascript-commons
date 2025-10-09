import { TreatmentWithConfig } from '../../../../types/splitio';
import { FallbackDiscardReason } from '../constants';


export class FallbacksSanitizer {

  private static readonly pattern = /^[0-9]+[.a-zA-Z0-9_-]*$|^[a-zA-Z]+[a-zA-Z0-9_-]*$/;

  private static isValidFlagName(name: string): boolean {
    return name.length <= 100 && !name.includes(' ');
  }

  private static isValidTreatment(t?: TreatmentWithConfig): boolean {
    if (!t || !t.treatment) {
      return false;
    }

    const { treatment } = t;

    if (treatment.length > 100) {
      return false;
    }

    return FallbacksSanitizer.pattern.test(treatment);
  }

  static sanitizeGlobal(treatment?: TreatmentWithConfig): TreatmentWithConfig | undefined {
    if (!this.isValidTreatment(treatment)) {
      console.error(
        `Fallback treatments - Discarded fallback: ${FallbackDiscardReason.Treatment}`
      );
      return undefined;
    }
    return treatment!;
  }

  static sanitizeByFlag(
    byFlagFallbacks: Record<string, TreatmentWithConfig>
  ): Record<string, TreatmentWithConfig> {
    const sanitizedByFlag: Record<string, TreatmentWithConfig> = {};

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
