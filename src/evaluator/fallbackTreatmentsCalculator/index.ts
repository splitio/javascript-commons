import { FallbackTreatmentConfiguration, FallbackTreatment, IFallbackTreatmentsCalculator} from '../../../types/splitio';

export class FallbackTreatmentsCalculator implements IFallbackTreatmentsCalculator {
  private readonly labelPrefix = 'fallback - ';
  private readonly control = 'CONTROL';
  private readonly fallbacks: FallbackTreatmentConfiguration;

  constructor(fallbacks: FallbackTreatmentConfiguration) {
    this.fallbacks = fallbacks;
  }

  resolve(flagName: string, label?: string | undefined): FallbackTreatment {
    const treatment = this.fallbacks.byFlag[flagName];
    if (treatment) {
      return this.copyWithLabel(treatment, label);
    }

    if (this.fallbacks.global) {
      return this.copyWithLabel(this.fallbacks.global, label);
    }

    return {
      treatment: this.control,
      config: null,
      label: this.resolveLabel(label),
    };
  }

  private copyWithLabel(fallback: FallbackTreatment, label: string | undefined): FallbackTreatment {
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

  private resolveLabel(label?: string | undefined): string | undefined {
    return label ? `${this.labelPrefix}${label}` : undefined;
  }

}
