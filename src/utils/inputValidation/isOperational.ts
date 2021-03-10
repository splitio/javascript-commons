import { ERROR_21, WARN_14 } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { IReadinessManager } from '../../readiness/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

export function validateIfNotDestroyed(log: ILogger, readinessManager: IReadinessManager): boolean {
  if (!readinessManager.isDestroyed()) return true;

  log.error(ERROR_21);
  return false;
}

export function validateIfOperational(log: ILogger, readinessManager: IReadinessManager, method: string) {
  if (readinessManager.isReady() || readinessManager.isReadyFromCache()) return true;

  log.warn(WARN_14, [method]);
  return false;
}
