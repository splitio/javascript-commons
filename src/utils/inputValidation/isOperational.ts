import { ERROR_CLIENT_DESTROYED, WARN_CLIENT_NOT_READY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { IReadinessManager } from '../../readiness/types';

export function validateIfNotDestroyed(log: ILogger, readinessManager: IReadinessManager, method: string): boolean {
  if (!readinessManager.isDestroyed()) return true;

  log.error(ERROR_CLIENT_DESTROYED, [method]);
  return false;
}

export function validateIfOperational(log: ILogger, readinessManager: IReadinessManager, method: string) {
  if (readinessManager.isReady() || readinessManager.isReadyFromCache()) return true;

  log.warn(WARN_CLIENT_NOT_READY, [method]);
  return false;
}
