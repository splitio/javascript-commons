import { FallbackTreatmentConfiguration, TreatmentWithConfig } from '../../../types/splitio';
import { CONTROL } from '../../utils/constants';
import { isString } from '../../utils/lang';

export type IFallbackTreatmentsCalculator = (flagName: string, label?: string) => TreatmentWithConfig & { label: string };

export const FALLBACK_PREFIX = 'fallback - ';

export function FallbackTreatmentsCalculator(fallbacks: FallbackTreatmentConfiguration = {}): IFallbackTreatmentsCalculator {

  return (flagName: string, label = '') => {
    const fallback = fallbacks.byFlag?.[flagName] || fallbacks.global;

    return fallback ?
      isString(fallback) ?
        {
          treatment: fallback,
          config: null,
          label: `${FALLBACK_PREFIX}${label}`,
        } :
        {
          treatment: fallback.treatment,
          config: fallback.config,
          label: `${FALLBACK_PREFIX}${label}`,
        } :
      {
        treatment: CONTROL,
        config: null,
        label,
      };
  };
}
