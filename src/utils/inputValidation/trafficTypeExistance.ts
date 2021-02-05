import thenable from '../promise/thenable';
import { LOCALHOST_MODE } from '../constants';
import { logFactory } from '../../logger/sdkLogger';
import { ISplitsCacheBase } from '../../storages/types';
import { IReadinessManager } from '../../readiness/types';
import { SDKMode } from '../../types';
import { MaybeThenable } from '../../dtos/types';
const log = logFactory('');

function logTTExistanceWarning(maybeTT: string, method: string) {
  log.warn(`${method}: Traffic Type ${maybeTT} does not have any corresponding Splits in this environment, make sure you're tracking your events to a valid traffic type defined in the Split console.`);
}

/**
 * Separated from the previous method since on some cases it'll be async.
 */
export function validateTrafficTypeExistance(readinessManager: IReadinessManager, splitsCache: ISplitsCacheBase, mode: SDKMode, maybeTT: string, method: string): MaybeThenable<boolean> {

  // If not ready or in localhost mode, we won't run the validation
  if (!readinessManager.isReady() || mode === LOCALHOST_MODE) return true;

  const res = splitsCache.trafficTypeExists(maybeTT);

  if (thenable(res)) {
    res.then(function (isValid) {
      if (!isValid) logTTExistanceWarning(maybeTT, method);

      return isValid; // propagate result
    });
  } else {
    if (!res) logTTExistanceWarning(maybeTT, method);
  }

  return res;
}
