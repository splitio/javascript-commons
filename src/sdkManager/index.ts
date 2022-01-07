import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { find } from '../utils/lang';
import { validateSplit, validateSplitExistance, validateIfNotDestroyed, validateIfOperational } from '../utils/inputValidation';
import { ISplitsCacheAsync, ISplitsCacheSync } from '../storages/types';
import { ISdkReadinessManager } from '../readiness/types';
import { ISplit } from '../dtos/types';
import { SplitIO } from '../types';
import { ILogger } from '../logger/types';

function collectTreatments(splitObject: ISplit) {
  const conditions = splitObject.conditions;
  // Rollout conditions are supposed to have the entire partitions list, so we find the first one.
  let allTreatmentsCondition = find(conditions, (cond) => cond.conditionType === 'ROLLOUT');
  // Localstorage mode could fall into a no rollout conditions state. Take the first condition in that case.
  if (!allTreatmentsCondition) allTreatmentsCondition = conditions[0];
  // Then extract the treatments from the partitions
  return allTreatmentsCondition ? allTreatmentsCondition.partitions.map(v => v.treatment) : [];
}

function objectToView(json: string | null): SplitIO.SplitView | null {
  let splitObject: ISplit | null;

  try {
    // @ts-expect-error
    splitObject = JSON.parse(json);
  } catch (e) {
    return null;
  }

  if (!splitObject) return null;

  return {
    name: splitObject.name,
    trafficType: splitObject.trafficTypeName,
    killed: splitObject.killed,
    changeNumber: splitObject.changeNumber || 0,
    treatments: collectTreatments(splitObject),
    configs: splitObject.configurations || {}
  };
}

function objectsToViews(jsons: string[]) {
  let views: SplitIO.SplitView[] = [];

  jsons.forEach(split => {
    const view = objectToView(split);
    if (view) views.push(view);
  });

  return views;
}

export function sdkManagerFactory<TSplitCache extends ISplitsCacheSync | ISplitsCacheAsync>(
  log: ILogger,
  splits: TSplitCache,
  { readinessManager, sdkStatus }: ISdkReadinessManager
): TSplitCache extends ISplitsCacheAsync ? SplitIO.IAsyncManager : SplitIO.IManager {
  const SPLIT_FN_LABEL = 'split';

  return objectAssign(
    // Proto-linkage of the readiness Event Emitter
    Object.create(sdkStatus),
    {
      /**
       * Get the Split object corresponding to the given split name if valid
       */
      split(maybeSplitName: string) {
        const splitName = validateSplit(log, maybeSplitName, SPLIT_FN_LABEL);
        if (!validateIfNotDestroyed(log, readinessManager, SPLIT_FN_LABEL) || !validateIfOperational(log, readinessManager, SPLIT_FN_LABEL) || !splitName) {
          return null;
        }

        const split = splits.getSplit(splitName);

        if (thenable(split)) {
          return split.catch(() => null).then(result => { // handle possible rejections when using pluggable storage
            validateSplitExistance(log, readinessManager, splitName, result, SPLIT_FN_LABEL);
            return objectToView(result);
          });
        }

        validateSplitExistance(log, readinessManager, splitName, split, SPLIT_FN_LABEL);

        return objectToView(split);
      },
      /**
       * Get the Split objects present on the factory storage
       */
      splits() {
        if (!validateIfNotDestroyed(log, readinessManager, 'splits') || !validateIfOperational(log, readinessManager, 'splits')) {
          return [];
        }
        const currentSplits = splits.getAll();

        return thenable(currentSplits) ?
          currentSplits.catch(() => []).then(objectsToViews) : // handle possible rejections when using pluggable storage
          objectsToViews(currentSplits);
      },
      /**
       * Get the Split names present on the factory storage
       */
      names() {
        if (!validateIfNotDestroyed(log, readinessManager, 'names') || !validateIfOperational(log, readinessManager, 'names')) {
          return [];
        }
        const splitNames = splits.getSplitNames();

        return thenable(splitNames) ?
          splitNames.catch(() => []) : // handle possible rejections when using pluggable storage
          splitNames;
      }
    }
  );
}
