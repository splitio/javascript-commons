import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { find } from '../utils/lang';
import { validateSplit, validateSplitExistence, validateIfNotDestroyed, validateIfOperational } from '../utils/inputValidation';
import { ISplitsCacheAsync, ISplitsCacheSync } from '../storages/types';
import { ISdkReadinessManager } from '../readiness/types';
import { ISplit } from '../dtos/types';
import { ISettings, SplitIO } from '../types';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import { SPLIT_FN_LABEL, SPLITS_FN_LABEL, NAMES_FN_LABEL } from '../utils/constants';

function collectTreatments(splitObject: ISplit) {
  const conditions = splitObject.conditions;
  // Rollout conditions are supposed to have the entire partitions list, so we find the first one.
  let allTreatmentsCondition = find(conditions, (cond) => cond.conditionType === 'ROLLOUT');
  // Localstorage mode could fall into a no rollout conditions state. Take the first condition in that case.
  if (!allTreatmentsCondition) allTreatmentsCondition = conditions[0];
  // Then extract the treatments from the partitions
  return allTreatmentsCondition ? allTreatmentsCondition.partitions.map(v => v.treatment) : [];
}

function objectToView(splitObject: ISplit | null): SplitIO.SplitView | null {
  if (!splitObject) return null;

  return {
    name: splitObject.name,
    trafficType: splitObject.trafficTypeName,
    killed: splitObject.killed,
    changeNumber: splitObject.changeNumber || 0,
    treatments: collectTreatments(splitObject),
    configs: splitObject.configurations || {},
    sets: splitObject.sets || [],
    defaultTreatment: splitObject.defaultTreatment
  };
}

function objectsToViews(splitObjects: ISplit[]) {
  let views: SplitIO.SplitView[] = [];

  splitObjects.forEach(split => {
    const view = objectToView(split);
    if (view) views.push(view);
  });

  return views;
}

export function sdkManagerFactory<TSplitCache extends ISplitsCacheSync | ISplitsCacheAsync>(
  settings: Pick<ISettings, 'log' | 'mode'>,
  splits: TSplitCache,
  { readinessManager, sdkStatus }: ISdkReadinessManager,
): TSplitCache extends ISplitsCacheAsync ? SplitIO.IAsyncManager : SplitIO.IManager {

  const { log, mode } = settings;
  const isAsync = isConsumerMode(mode);

  return objectAssign(
    // Proto-linkage of the readiness Event Emitter
    Object.create(sdkStatus),
    {
      /**
       * Get the feature flag object corresponding to the given feature flag name if valid
       */
      split(featureFlagName: string) {
        const splitName = validateSplit(log, featureFlagName, SPLIT_FN_LABEL);
        if (!validateIfNotDestroyed(log, readinessManager, SPLIT_FN_LABEL) || !validateIfOperational(log, readinessManager, SPLIT_FN_LABEL) || !splitName) {
          return isAsync ? Promise.resolve(null) : null;
        }

        const split = splits.getSplit(splitName);

        if (thenable(split)) {
          return split.catch(() => null).then(result => { // handle possible rejections when using pluggable storage
            validateSplitExistence(log, readinessManager, splitName, result, SPLIT_FN_LABEL);
            return objectToView(result);
          });
        }

        validateSplitExistence(log, readinessManager, splitName, split, SPLIT_FN_LABEL);

        return objectToView(split);
      },
      /**
       * Get the feature flag objects present on the factory storage
       */
      splits() {
        if (!validateIfNotDestroyed(log, readinessManager, SPLITS_FN_LABEL) || !validateIfOperational(log, readinessManager, SPLITS_FN_LABEL)) {
          return isAsync ? Promise.resolve([]) : [];
        }
        const currentSplits = splits.getAll();

        return thenable(currentSplits) ?
          currentSplits.catch(() => []).then(objectsToViews) : // handle possible rejections when using pluggable storage
          objectsToViews(currentSplits);
      },
      /**
       * Get the feature flag names present on the factory storage
       */
      names() {
        if (!validateIfNotDestroyed(log, readinessManager, NAMES_FN_LABEL) || !validateIfOperational(log, readinessManager, NAMES_FN_LABEL)) {
          return isAsync ? Promise.resolve([]) : [];
        }
        const splitNames = splits.getSplitNames();

        return thenable(splitNames) ?
          splitNames.catch(() => []) : // handle possible rejections when using pluggable storage
          splitNames;
      }
    }
  );
}
