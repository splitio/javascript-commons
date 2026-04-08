import SplitIO from '../../../../types/splitio';
import { ILogger } from '../../../logger/types';
import { isObject, isString } from '../../../utils/lang';

enum FallbackDiscardReason {
  ConfigName = 'Invalid config name (max 100 chars, no spaces)',
  Variant = 'Invalid variant (max 100 chars and must match pattern)',
  Value = 'Invalid value (must be an object)',
}

const VARIANT_PATTERN = /^[0-9]+[.a-zA-Z0-9_-]*$|^[a-zA-Z]+[a-zA-Z0-9_-]*$/;

export function isValidConfigName(name: string): boolean {
  return name.length <= 100 && !name.includes(' ');
}

export function isValidConfig(config?: SplitIO.Config): boolean {
  if (!isObject(config)) return false;
  if (!isString(config!.variant) || config!.variant.length > 100 || !VARIANT_PATTERN.test(config!.variant)) return false;
  if (!isObject(config!.value)) return false;
  return true;
}

function sanitizeGlobal(logger: ILogger, config?: SplitIO.Config): SplitIO.Config | undefined {
  if (config === undefined) return undefined;
  if (!isValidConfig(config)) {
    if (!isObject(config) || !isString(config!.variant) || config!.variant.length > 100 || !VARIANT_PATTERN.test(config!.variant)) {
      logger.error(`Fallback configs - Discarded fallback: ${FallbackDiscardReason.Variant}`);
    } else {
      logger.error(`Fallback configs - Discarded fallback: ${FallbackDiscardReason.Value}`);
    }
    return undefined;
  }
  return config;
}

function sanitizeByName(
  logger: ILogger,
  byNameFallbacks?: Record<string, SplitIO.Config>
): Record<string, SplitIO.Config> {
  const sanitizedByName: Record<string, SplitIO.Config> = {};

  if (!isObject(byNameFallbacks)) return sanitizedByName;

  Object.keys(byNameFallbacks!).forEach((configName) => {
    const config = byNameFallbacks![configName];

    if (!isValidConfigName(configName)) {
      logger.error(`Fallback configs - Discarded config '${configName}': ${FallbackDiscardReason.ConfigName}`);
      return;
    }

    if (!isValidConfig(config)) {
      if (!isObject(config) || !isString(config.variant) || config.variant.length > 100 || !VARIANT_PATTERN.test(config.variant)) {
        logger.error(`Fallback configs - Discarded config '${configName}': ${FallbackDiscardReason.Variant}`);
      } else {
        logger.error(`Fallback configs - Discarded config '${configName}': ${FallbackDiscardReason.Value}`);
      }
      return;
    }

    sanitizedByName[configName] = config;
  });

  return sanitizedByName;
}

export function sanitizeFallbacks(logger: ILogger, fallbacks: SplitIO.FallbackConfigs): SplitIO.FallbackConfigs | undefined {
  if (!isObject(fallbacks)) {
    logger.error('Fallback configs - Discarded configuration: it must be an object with optional `global` and `byName` properties');
    return;
  }

  return {
    global: sanitizeGlobal(logger, fallbacks.global),
    byName: sanitizeByName(logger, fallbacks.byName)
  };
}
