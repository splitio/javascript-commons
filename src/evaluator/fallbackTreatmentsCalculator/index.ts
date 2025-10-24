import { FallbackTreatmentConfiguration, Treatment, TreatmentWithConfig } from '../../../types/splitio';
import { FallbacksSanitizer } from './fallbackSanitizer';
import { CONTROL } from '../../utils/constants';
import { isString } from '../../utils/lang';
import { ILogger } from '../../logger/types';

export type IFallbackTreatmentsCalculator = {
  resolve(flagName: string, label: string): TreatmentWithConfig & { label: string };
}

export const FALLBACK_PREFIX = 'fallback - ';

export class FallbackTreatmentsCalculator implements IFallbackTreatmentsCalculator {
  private readonly fallbacks: FallbackTreatmentConfiguration;

  constructor(logger: ILogger, fallbacks?: FallbackTreatmentConfiguration) {
    const sanitizedGlobal = fallbacks?.global ? FallbacksSanitizer.sanitizeGlobal(logger, fallbacks.global) : undefined;
    const sanitizedByFlag = fallbacks?.byFlag ? FallbacksSanitizer.sanitizeByFlag(logger, fallbacks.byFlag) : {};
    this.fallbacks = {
      global: sanitizedGlobal,
      byFlag: sanitizedByFlag
    };
  }

  resolve(flagName: string, label: string): TreatmentWithConfig & { label: string } {
    const treatment = this.fallbacks.byFlag?.[flagName];
    if (treatment) {
      return this.copyWithLabel(treatment, label);
    }

    if (this.fallbacks.global) {
      return this.copyWithLabel(this.fallbacks.global, label);
    }

    return {
      treatment: CONTROL,
      config: null,
      label,
    };
  }

  private copyWithLabel(fallback: Treatment | TreatmentWithConfig, label: string): TreatmentWithConfig & { label: string } {
    if (isString(fallback)) {
      return {
        treatment: fallback,
        config: null,
        label: `${FALLBACK_PREFIX}${label}`,
      };
    }

    return {
      treatment: fallback.treatment,
      config: fallback.config,
      label: `${FALLBACK_PREFIX}${label}`,
    };
  }
}
