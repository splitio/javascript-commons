import { objectAssign } from '../utils/lang/objectAssign';
import { thenable } from '../utils/promise/thenable';
import { find } from '../utils/lang';
import { validateDefinition, validateDefinitionExistence, validateIfOperational } from '../utils/inputValidation';
import { IDefinitionsCacheAsync, IDefinitionsCacheSync } from '../storages/types';
import { ISdkReadinessManager } from '../readiness/types';
import { IDefinition } from '../dtos/types';
import { ISettings } from '../types';
import SplitIO from '../../types/splitio';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import { SPLIT_FN_LABEL, SPLITS_FN_LABEL, NAMES_FN_LABEL } from '../utils/constants';

function collectTreatments(splitObject: IDefinition) {
  const conditions = splitObject.conditions;
  // Rollout conditions are supposed to have the entire partitions list, so we find the first one.
  let allTreatmentsCondition = find(conditions, (cond) => cond.conditionType === 'ROLLOUT');
  // Localstorage mode could fall into a no rollout conditions state. Take the first condition in that case.
  if (!allTreatmentsCondition) allTreatmentsCondition = conditions[0];
  // Then extract the treatments from the partitions
  return allTreatmentsCondition ? allTreatmentsCondition.partitions!.map(v => v.treatment) : [];
}

function objectToView(splitObject: IDefinition | null): SplitIO.SplitView | null {
  if (!splitObject) return null;

  return {
    name: splitObject.name,
    trafficType: splitObject.trafficTypeName,
    killed: splitObject.killed,
    changeNumber: splitObject.changeNumber || 0,
    treatments: collectTreatments(splitObject),
    configs: splitObject.configurations as SplitIO.SplitView['configs'] || {},
    sets: splitObject.sets || [],
    defaultTreatment: splitObject.defaultTreatment,
    impressionsDisabled: splitObject.impressionsDisabled === true,
    prerequisites: (splitObject.prerequisites || []).map(p => ({ flagName: p.n, treatments: p.ts })),
  };
}

function objectsToViews(splitObjects: IDefinition[]) {
  let views: SplitIO.SplitView[] = [];

  splitObjects.forEach(split => {
    const view = objectToView(split);
    if (view) views.push(view);
  });

  return views;
}

export function sdkManagerFactory<TDefinitionsCache extends IDefinitionsCacheSync | IDefinitionsCacheAsync>(
  settings: Pick<ISettings, 'log' | 'mode'>,
  splits: TDefinitionsCache,
  { readinessManager, sdkStatus }: ISdkReadinessManager,
): TDefinitionsCache extends IDefinitionsCacheAsync ? SplitIO.IAsyncManager : SplitIO.IManager {

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
        const splitName = validateDefinition(log, featureFlagName, SPLIT_FN_LABEL);
        if (!validateIfOperational(log, readinessManager, SPLIT_FN_LABEL) || !splitName) {
          return isAsync ? Promise.resolve(null) : null;
        }

        const split = splits.get(splitName);

        if (thenable(split)) {
          return split.catch(() => null).then(result => { // handle possible rejections when using pluggable storage
            validateDefinitionExistence(log, readinessManager, splitName, result, SPLIT_FN_LABEL);
            return objectToView(result);
          });
        }

        validateDefinitionExistence(log, readinessManager, splitName, split, SPLIT_FN_LABEL);

        return objectToView(split);
      },
      /**
       * Get the feature flag objects present on the factory storage
       */
      splits() {
        if (!validateIfOperational(log, readinessManager, SPLITS_FN_LABEL)) {
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
        if (!validateIfOperational(log, readinessManager, NAMES_FN_LABEL)) {
          return isAsync ? Promise.resolve([]) : [];
        }
        const splitNames = splits.getNames();

        return thenable(splitNames) ?
          splitNames.catch(() => []) : // handle possible rejections when using pluggable storage
          splitNames;
      }
    }
  );
}
