import { engineParser } from './Engine';
import { thenable } from '../utils/promise/thenable';
import { EXCEPTION, SPLIT_NOT_FOUND } from '../utils/labels';
import { CONTROL } from '../utils/constants';
import { ISplit, MaybeThenable } from '../dtos/types';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { IEvaluationResult } from './types';
import SplitIO from '../../types/splitio';
import { ILogger } from '../logger/types';
import { returnSetsUnion, setToArray } from '../utils/lang/sets';
import { WARN_FLAGSET_WITHOUT_FLAGS } from '../logger/constants';
import { FallbackTreatmentsCalculator } from './fallbackTreatmentsCalculator';

const treatmentException = {
  treatment: CONTROL,
  label: EXCEPTION,
  config: null
};

function treatmentsException(splitNames: string[]) {
  const evaluations: Record<string, IEvaluationResult> = {};
  splitNames.forEach(splitName => {
    evaluations[splitName] = treatmentException;
  });
  return evaluations;
}

export function evaluateFeature(
  log: ILogger,
  key: SplitIO.SplitKey,
  splitName: string,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  fallbackTreatmentsCalculator: FallbackTreatmentsCalculator,
): MaybeThenable<IEvaluationResult> {
  let parsedSplit;

  try {
    parsedSplit = storage.splits.getSplit(splitName);
  } catch (e) {
    // Exception on sync `getSplit` storage. Not possible ATM with InMemory and InLocal storages.
    return treatmentException;
  }

  if (thenable(parsedSplit)) {
    return parsedSplit.then((split) => getEvaluation(
      log,
      key,
      split,
      attributes,
      storage,
      fallbackTreatmentsCalculator,
    )).catch(
      // Exception on async `getSplit` storage. For example, when the storage is redis or
      // pluggable and there is a connection issue and we can't retrieve the split to be evaluated
      () => treatmentException
    );
  }

  return getEvaluation(
    log,
    key,
    parsedSplit,
    attributes,
    storage,
    fallbackTreatmentsCalculator,
  );
}

export function evaluateFeatures(
  log: ILogger,
  key: SplitIO.SplitKey,
  splitNames: string[],
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  fallbackTreatmentsCalculator: FallbackTreatmentsCalculator
): MaybeThenable<Record<string, IEvaluationResult>> {
  let parsedSplits;

  try {
    parsedSplits = storage.splits.getSplits(splitNames);
  } catch (e) {
    // Exception on sync `getSplits` storage. Not possible ATM with InMemory and InLocal storages.
    return treatmentsException(splitNames);
  }

  return thenable(parsedSplits) ?
    parsedSplits.then(splits => getEvaluations(log, key, splitNames, splits, attributes, storage, fallbackTreatmentsCalculator))
      .catch(() => {
        // Exception on async `getSplits` storage. For example, when the storage is redis or
        // pluggable and there is a connection issue and we can't retrieve the split to be evaluated
        return treatmentsException(splitNames);
      }) :
    getEvaluations(log, key, splitNames, parsedSplits, attributes, storage, fallbackTreatmentsCalculator);
}

export function evaluateFeaturesByFlagSets(
  log: ILogger,
  key: SplitIO.SplitKey,
  flagSets: string[],
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  method: string,
  fallbackTreatmentsCalculator: FallbackTreatmentsCalculator
): MaybeThenable<Record<string, IEvaluationResult>> {
  let storedFlagNames: MaybeThenable<Set<string>[]>;

  function evaluate(featureFlagsByFlagSets: Set<string>[]) {
    let featureFlags = new Set<string>();
    for (let i = 0; i < flagSets.length; i++) {
      const featureFlagByFlagSet = featureFlagsByFlagSets[i];
      if (featureFlagByFlagSet.size) {
        featureFlags = returnSetsUnion(featureFlags, featureFlagByFlagSet);
      } else {
        log.warn(WARN_FLAGSET_WITHOUT_FLAGS, [method, flagSets[i]]);
      }
    }

    return featureFlags.size ?
      evaluateFeatures(log, key, setToArray(featureFlags), attributes, storage, fallbackTreatmentsCalculator) :
      {};
  }

  // get features by flag sets
  try {
    storedFlagNames = storage.splits.getNamesByFlagSets(flagSets);
  } catch (e) {
    // return empty evaluations
    return {};
  }

  // evaluate related features
  return thenable(storedFlagNames) ?
    storedFlagNames.then((storedFlagNames) => evaluate(storedFlagNames))
      .catch(() => {
        return {};
      }) :
    evaluate(storedFlagNames);
}

function getEvaluation(
  log: ILogger,
  key: SplitIO.SplitKey,
  splitJSON: ISplit | null,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  fallbackTreatmentsCalculator: FallbackTreatmentsCalculator
): MaybeThenable<IEvaluationResult> {
  let evaluation: MaybeThenable<IEvaluationResult> = {
    treatment: CONTROL,
    label: SPLIT_NOT_FOUND,
    config: null
  };

  if (splitJSON) {
    const split = engineParser(log, splitJSON, storage, fallbackTreatmentsCalculator);
    evaluation = split.getTreatment(key, attributes, evaluateFeature);

    // If the storage is async and the evaluated flag uses segments or dependencies, evaluation is thenable
    if (thenable(evaluation)) {
      return evaluation.then(result => {
        return buildEvaluation(result, splitJSON, fallbackTreatmentsCalculator);
      });
    }
  }

  return buildEvaluation(evaluation, splitJSON, fallbackTreatmentsCalculator);
}

function buildEvaluation(evaluation: IEvaluationResult, splitJSON: ISplit | null, fallbackTreatmentsCalculator: FallbackTreatmentsCalculator): IEvaluationResult {

  const result: IEvaluationResult = {
    treatment: evaluation.treatment,
    label: evaluation.label,
    config: evaluation.config
  };

  if (!splitJSON) return result;

  result.changeNumber = splitJSON.changeNumber;
  result.config = splitJSON.configurations && splitJSON.configurations[evaluation.treatment] || null;
  result.impressionsDisabled = splitJSON.impressionsDisabled;
  if (evaluation.treatment === CONTROL) {
    const fallbackTreatment = fallbackTreatmentsCalculator.resolve(splitJSON.name, evaluation.label);
    result.treatment = fallbackTreatment.treatment;
    result.label = fallbackTreatment.label ? fallbackTreatment.label : '';
    result.config = fallbackTreatment.config;
  }
  return result;
}

function getEvaluations(
  log: ILogger,
  key: SplitIO.SplitKey,
  splitNames: string[],
  splits: Record<string, ISplit | null>,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  fallbackTreatmentsCalculator: FallbackTreatmentsCalculator
): MaybeThenable<Record<string, IEvaluationResult>> {
  const result: Record<string, IEvaluationResult> = {};
  const thenables: Promise<void>[] = [];
  splitNames.forEach(splitName => {
    const evaluation = getEvaluation(
      log,
      key,
      splits[splitName],
      attributes,
      storage,
      fallbackTreatmentsCalculator
    );
    if (thenable(evaluation)) {
      thenables.push(evaluation.then(res => {
        result[splitName] = res;
      }));
    } else {
      result[splitName] = evaluation;
    }
  });

  return thenables.length > 0 ? Promise.all(thenables).then(() => result) : result;
}
