import { Treatment, TreatmentWithConfig } from '../../../../types/splitio';
import { ILogger } from '../../../logger/types';
import { isObject, isString } from '../../../utils/lang';
import { FallbackDiscardReason } from '../constants';


export class FallbacksSanitizer {

  private static readonly pattern = /^[0-9]+[.a-zA-Z0-9_-]*$|^[a-zA-Z]+[a-zA-Z0-9_-]*$/;

  private static isValidFlagName(name: string): boolean {
    return name.length <= 100 && !name.includes(' ');
  }

  private static isValidTreatment(t?: Treatment | TreatmentWithConfig): boolean {
    const treatment = isObject(t) ? (t as TreatmentWithConfig).treatment : t;

    if (!isString(treatment) || treatment.length > 100) {
      return false;
    }
    return FallbacksSanitizer.pattern.test(treatment);
  }

  static sanitizeGlobal(logger: ILogger, treatment?: Treatment | TreatmentWithConfig): Treatment | TreatmentWithConfig | undefined {
    if (!this.isValidTreatment(treatment)) {
      logger.error(
        `Fallback treatments - Discarded fallback: ${FallbackDiscardReason.Treatment}`
      );
      return undefined;
    }
    return treatment;
  }

  static sanitizeByFlag(
    logger: ILogger,
    byFlagFallbacks: Record<string, Treatment | TreatmentWithConfig>
  ): Record<string, Treatment | TreatmentWithConfig> {
    const sanitizedByFlag: Record<string, Treatment | TreatmentWithConfig> = {};

    const entries = Object.keys(byFlagFallbacks);
    entries.forEach((flag) => {
      const t = byFlagFallbacks[flag];
      if (!this.isValidFlagName(flag)) {
        logger.error(
          `Fallback treatments - Discarded flag '${flag}': ${FallbackDiscardReason.FlagName}`
        );
        return;
      }

      if (!this.isValidTreatment(t)) {
        logger.error(
          `Fallback treatments - Discarded treatment for flag '${flag}': ${FallbackDiscardReason.Treatment}`
        );
        return;
      }

      sanitizedByFlag[flag] = t;
    });

    return sanitizedByFlag;
  }
}
