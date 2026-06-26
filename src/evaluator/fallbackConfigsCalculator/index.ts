import { IFallbackCalculator } from '../fallbackTreatmentsCalculator/index';
import { CONTROL } from '../../utils/constants';
import SplitIO from '../../../types/splitio';

export const FALLBACK_PREFIX = 'fallback - ';

export function FallbackConfigsCalculator(fallbacks: SplitIO.FallbackConfigs = {}): IFallbackCalculator {

  return (configName: string, label = '') => {
    const fallback = fallbacks.byName?.[configName] || fallbacks.global;

    return fallback ?
      {
        treatment: fallback.variant,
        config: fallback.value,
        label: `${FALLBACK_PREFIX}${label}`,
      } :
      {
        treatment: CONTROL,
        config: null,
        label,
      };
  };
}
