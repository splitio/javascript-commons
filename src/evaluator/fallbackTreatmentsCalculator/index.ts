import { FallbackTreatmentConfiguration, FallbackTreatment } from '../../../types/splitio';
import { FallbacksSanitizer } from './fallbackSanitizer';
import { CONTROL } from '../../utils/constants';
import { isString } from '../../utils/lang';
import { ILogger } from '../../logger/types';

type IFallbackTreatmentsCalculator = {
  resolve(flagName: string, label?: string): FallbackTreatment;
}

export class FallbackTreatmentsCalculator implements IFallbackTreatmentsCalculator {
  private readonly labelPrefix = 'fallback - ';
  private readonly fallbacks: FallbackTreatmentConfiguration;

  constructor(logger: ILogger, fallbacks?: FallbackTreatmentConfiguration) {
    const sanitizedGlobal = fallbacks?.global ? FallbacksSanitizer.sanitizeGlobal(logger, fallbacks.global) : undefined;
    const sanitizedByFlag = fallbacks?.byFlag ? FallbacksSanitizer.sanitizeByFlag(logger, fallbacks.byFlag) : {};
    this.fallbacks = {
      global: sanitizedGlobal,
      byFlag: sanitizedByFlag
    };
  }

  resolve(flagName: string, label?: string): FallbackTreatment & { label?: string } {
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

  private copyWithLabel(fallback: string | FallbackTreatment, label: string | undefined): FallbackTreatment & { label?: string } {
    if (isString(fallback)) {
      return {
        treatment: fallback,
        config: null,
        label: this.resolveLabel(label),
      };
    }

    return {
      treatment: fallback.treatment,
      config: fallback.config,
      label: this.resolveLabel(label),
    };
  }

  private resolveLabel(label?: string): string {
    return label ? `${this.labelPrefix}${label}` : '';
  }

}
