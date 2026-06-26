import { FALLBACK_DEFINITION_NOT_FOUND, DEFINITION_NOT_FOUND } from '../labels';
import { IReadinessManager } from '../../readiness/types';
import { ILogger } from '../../logger/types';
import { WARN_NOT_EXISTENT_DEFINITION } from '../../logger/constants';

/**
 * This is defined here and in this format mostly because of the logger and the fact that it's considered a validation at product level.
 * But it's not going to run on the input validation layer. In any case, the most compelling reason to use it as we do is to avoid going to Redis and get a definition twice.
 */
export function validateDefinitionExistence(log: ILogger, readinessManager: IReadinessManager, definitionName: string, labelOrDefinitionObj: any, method: string): boolean {
  if (readinessManager.isReady()) { // Only if it's ready (synced with BE) we validate this, otherwise it may just be that the SDK is still syncing
    if (labelOrDefinitionObj === DEFINITION_NOT_FOUND || labelOrDefinitionObj === FALLBACK_DEFINITION_NOT_FOUND || labelOrDefinitionObj == null) {
      log.warn(WARN_NOT_EXISTENT_DEFINITION, [method, definitionName]);
      return false;
    }
  }

  return true;
}
