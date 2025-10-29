import { FallbackTreatmentConfiguration, Treatment, TreatmentWithConfig } from '../../../../types/splitio';
import { ILogger } from '../../../logger/types';
import { isObject, isString } from '../../../utils/lang';

enum FallbackDiscardReason {
  FlagName = 'Invalid flag name (max 100 chars, no spaces)',
  Treatment = 'Invalid treatment (max 100 chars and must match pattern)',
}

const TREATMENT_PATTERN = /^[0-9]+[.a-zA-Z0-9_-]*$|^[a-zA-Z]+[a-zA-Z0-9_-]*$/;

function isValidFlagName(name: string): boolean {
  return name.length <= 100 && !name.includes(' ');
}

function isValidTreatment(t?: Treatment | TreatmentWithConfig): boolean {
  const treatment = isObject(t) ? (t as TreatmentWithConfig).treatment : t;

  if (!isString(treatment) || treatment.length > 100) {
    return false;
  }
  return TREATMENT_PATTERN.test(treatment);
}

function sanitizeGlobal(logger: ILogger, treatment?: Treatment | TreatmentWithConfig): Treatment | TreatmentWithConfig | undefined {
  if (!isValidTreatment(treatment)) {
    logger.error(`Fallback treatments - Discarded fallback: ${FallbackDiscardReason.Treatment}`);
    return undefined;
  }
  return treatment;
}

function sanitizeByFlag(
  logger: ILogger,
  byFlagFallbacks: Record<string, Treatment | TreatmentWithConfig> = {}
): Record<string, Treatment | TreatmentWithConfig> {
  const sanitizedByFlag: Record<string, Treatment | TreatmentWithConfig> = {};

  const entries = Object.keys(byFlagFallbacks);
  entries.forEach((flag) => {
    const t = byFlagFallbacks[flag];
    if (!isValidFlagName(flag)) {
      logger.error(`Fallback treatments - Discarded flag '${flag}': ${FallbackDiscardReason.FlagName}`);
      return;
    }

    if (!isValidTreatment(t)) {
      logger.error(`Fallback treatments - Discarded treatment for flag '${flag}': ${FallbackDiscardReason.Treatment}`);
      return;
    }

    sanitizedByFlag[flag] = t;
  });

  return sanitizedByFlag;
}

export function sanitizeFallbacks(logger: ILogger, fallbacks: unknown): FallbackTreatmentConfiguration | undefined {
  if (!isObject(fallbacks)) {
    logger.error('Fallback treatments - Discarded fallback: Invalid fallback configuration');
    return;
  }

  return {
    global: sanitizeGlobal(logger, (fallbacks as FallbackTreatmentConfiguration).global),
    byFlag: sanitizeByFlag(logger, (fallbacks as FallbackTreatmentConfiguration).byFlag)
  };
}
