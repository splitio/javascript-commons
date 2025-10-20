import { FallbackTreatmentConfiguration, FallbackTreatment, IFallbackTreatmentsCalculator} from '../../../types/splitio';
import { FallbacksSanitizer } from './fallbackSanitizer';
import { CONTROL } from '../../utils/constants';


export class FallbackTreatmentsCalculator implements IFallbackTreatmentsCalculator {
  private readonly labelPrefix = 'fallback - ';
  private readonly fallbacks: FallbackTreatmentConfiguration;

  constructor(fallbacks?: FallbackTreatmentConfiguration) {
    const sanitizedGlobal = fallbacks?.global ? FallbacksSanitizer.sanitizeGlobal(fallbacks.global) : undefined;
    const sanitizedByFlag = fallbacks?.byFlag ? FallbacksSanitizer.sanitizeByFlag(fallbacks.byFlag) : {};
    this.fallbacks = {
      global: sanitizedGlobal,
      byFlag: sanitizedByFlag
    };
  }

  resolve(flagName: string, label?: string | undefined): FallbackTreatment {
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

  private copyWithLabel(fallback: string | FallbackTreatment, label: string | undefined): FallbackTreatment {
    if (typeof fallback === 'string') {
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

  private resolveLabel(label?: string | undefined): string {
    return label ? `${this.labelPrefix}${label}` : '';
  }

}
