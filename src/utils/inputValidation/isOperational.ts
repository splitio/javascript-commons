import { ERROR_CLIENT_DESTROYED, CLIENT_NOT_READY_FROM_CACHE } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { IReadinessManager } from '../../readiness/types';

export function validateIfNotDestroyed(log: ILogger, readinessManager: IReadinessManager, method: string): boolean {
  if (!readinessManager.isDestroyed()) return true;

  log.error(ERROR_CLIENT_DESTROYED, [method]);
  return false;
}

export function validateIfReadyFromCache(log: ILogger, readinessManager: IReadinessManager, method: string, featureFlagNameOrNames?: string | string[] | false) {
  if (readinessManager.isReadyFromCache()) return true;

  log.warn(CLIENT_NOT_READY_FROM_CACHE, [method, featureFlagNameOrNames ? ` for feature flag ${featureFlagNameOrNames.toString()}` : '']);
  return false;
}

// Operational means that the SDK is ready to evaluate (not destroyed and ready from cache)
export function validateIfOperational(log: ILogger, readinessManager: IReadinessManager, method: string, featureFlagNameOrNames?: string | string[] | false) {
  return validateIfNotDestroyed(log, readinessManager, method) && validateIfReadyFromCache(log, readinessManager, method, featureFlagNameOrNames);
}
