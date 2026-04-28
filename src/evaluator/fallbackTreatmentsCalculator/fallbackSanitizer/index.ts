import { FallbackTreatmentConfiguration, Treatment, TreatmentWithConfig } from '../../../../types/splitio';
import { ILogger } from '../../../logger/types';
import { isObject, isString } from '../../../utils/lang';

const FLAG_NAME_DISCARD_REASON = 'Invalid flag name (max 100 chars, no spaces)';
const TREATMENT_DISCARD_REASON = 'Invalid treatment (max 100 chars and must match pattern)';

const TREATMENT_PATTERN = /^[0-9]+[.a-zA-Z0-9_-]*$|^[a-zA-Z]+[a-zA-Z0-9_-]*$/;

export function isValidFlagName(name: string): boolean {
  return name.length <= 100 && !name.includes(' ');
}

export function isValidTreatment(t?: Treatment | TreatmentWithConfig): boolean {
  const treatment = isObject(t) ? (t as TreatmentWithConfig).treatment : t;

  if (!isString(treatment) || treatment.length > 100) {
    return false;
  }
  return TREATMENT_PATTERN.test(treatment);
}

function sanitizeGlobal(logger: ILogger, treatment?: Treatment | TreatmentWithConfig): Treatment | TreatmentWithConfig | undefined {
  if (treatment === undefined) return undefined;
  if (!isValidTreatment(treatment)) {
    logger.error(`Fallback treatments - Discarded fallback: ${TREATMENT_DISCARD_REASON}`);
    return undefined;
  }
  return treatment;
}

function sanitizeByFlag(
  logger: ILogger,
  byFlagFallbacks?: Record<string, Treatment | TreatmentWithConfig>
): Record<string, Treatment | TreatmentWithConfig> {
  const sanitizedByFlag: Record<string, Treatment | TreatmentWithConfig> = {};

  if (!isObject(byFlagFallbacks)) return sanitizedByFlag;

  Object.keys(byFlagFallbacks!).forEach((flag) => {
    const t = byFlagFallbacks![flag];

    if (!isValidFlagName(flag)) {
      logger.error(`Fallback treatments - Discarded flag '${flag}': ${FLAG_NAME_DISCARD_REASON}`);
      return;
    }

    if (!isValidTreatment(t)) {
      logger.error(`Fallback treatments - Discarded treatment for flag '${flag}': ${TREATMENT_DISCARD_REASON}`);
      return;
    }

    sanitizedByFlag[flag] = t;
  });

  return sanitizedByFlag;
}

export function sanitizeFallbacks(logger: ILogger, fallbacks: FallbackTreatmentConfiguration): FallbackTreatmentConfiguration | undefined {
  if (!isObject(fallbacks)) {
    logger.error('Fallback treatments - Discarded configuration: it must be an object with optional `global` and `byFlag` properties');
    return;
  }

  return {
    global: sanitizeGlobal(logger, fallbacks.global),
    byFlag: sanitizeByFlag(logger, fallbacks.byFlag)
  };
}
