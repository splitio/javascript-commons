import { SPLIT_NOT_FOUND } from '../labels';
import { IReadinessManager } from '../../readiness/types';
import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('');

/**
 * This is defined here and in this format mostly because of the logger and the fact that it's considered a validation at product level.
 * But it's not going to run on the input validation layer. In any case, the most compeling reason to use it as we do is to avoid going to Redis and get a split twice.
 */
export function validateSplitExistance(readinessManager: IReadinessManager, splitName: string, labelOrSplitObj: any, method: string): boolean {
  if (readinessManager.isReady()) { // Only if it's ready we validate this, otherwise it may just be that the SDK is not ready yet.
    if (labelOrSplitObj === SPLIT_NOT_FOUND || labelOrSplitObj == null) {
      log.w(`${method}: you passed "${splitName}" that does not exist in this environment, please double check what Splits exist in the web console.`);
      return false;
    }
  }

  return true;
}
