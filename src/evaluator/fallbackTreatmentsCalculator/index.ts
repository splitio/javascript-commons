import { CONTROL } from '../../utils/constants';
import { isString } from '../../utils/lang';
import SplitIO from '../../../types/splitio';

export type IFallbackCalculator = (definitionName: string, label?: string) => {
  treatment: string;
  config: string | null | SplitIO.JsonObject;
  label: string
};

export const FALLBACK_PREFIX = 'fallback - ';

export function FallbackTreatmentsCalculator(fallbacks: SplitIO.FallbackTreatmentConfiguration = {}): IFallbackCalculator {

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
