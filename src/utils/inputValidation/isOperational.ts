import { ILogger } from '../../logger/types';
import { IReadinessManager } from '../../readiness/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('', { displayAllErrors: true });

export function validateIfNotDestroyed(log: ILogger, readinessManager: IReadinessManager): boolean {
  if (!readinessManager.isDestroyed()) return true;

  log.e('Client has already been destroyed - no calls possible.');
  return false;
}

export function validateIfOperational(log: ILogger, readinessManager: IReadinessManager, method: string) {
  if (readinessManager.isReady() || readinessManager.isReadyFromCache()) return true;

  log.w(`${method}: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.`);
  return false;
}
