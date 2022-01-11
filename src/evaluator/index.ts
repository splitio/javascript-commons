import { Engine } from './Engine';
import { thenable } from '../utils/promise/thenable';
import * as LabelsConstants from '../utils/labels';
import { CONTROL } from '../utils/constants';
import { ISplit, MaybeThenable } from '../dtos/types';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { IEvaluationResult } from './types';
import { SplitIO } from '../types';
import { ILogger } from '../logger/types';

const treatmentException = {
  treatment: CONTROL,
  label: LabelsConstants.EXCEPTION,
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
): MaybeThenable<IEvaluationResult> {
  let stringifiedSplit;

  try {
    stringifiedSplit = storage.splits.getSplit(splitName);
  } catch (e) {
    // Exception on sync `getSplit` storage. Not possible ATM with InMemory and InLocal storages.
    return treatmentException;
  }

  if (thenable(stringifiedSplit)) {
    return stringifiedSplit.then((result) => getEvaluation(
      log,
      result,
      key,
      attributes,
      storage,
    )).catch(
      // Exception on async `getSplit` storage. For example, when the storage is redis or
      // pluggable and there is a connection issue and we can't retrieve the split to be evaluated
      () => treatmentException
    );
  }

  return getEvaluation(
    log,
    stringifiedSplit,
    key,
    attributes,
    storage,
  );
}

export function evaluateFeatures(
  log: ILogger,
  key: SplitIO.SplitKey,
  splitNames: string[],
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
): MaybeThenable<Record<string, IEvaluationResult>> {
  let stringifiedSplits;

  try {
    stringifiedSplits = storage.splits.getSplits(splitNames);
  } catch (e) {
    // Exception on sync `getSplits` storage. Not possible ATM with InMemory and InLocal storages.
    return treatmentsException(splitNames);
  }

  return (thenable(stringifiedSplits)) ?
    stringifiedSplits.then(splits => getEvaluations(log, splitNames, splits, key, attributes, storage))
      .catch(() => {
        // Exception on async `getSplits` storage. For example, when the storage is redis or
        // pluggable and there is a connection issue and we can't retrieve the split to be evaluated
        return treatmentsException(splitNames);
      }) :
    getEvaluations(log, splitNames, stringifiedSplits, key, attributes, storage);
}

function getEvaluation(
  log: ILogger,
  stringifiedSplit: string | null,
  key: SplitIO.SplitKey,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
): MaybeThenable<IEvaluationResult> {
  let evaluation: MaybeThenable<IEvaluationResult> = {
    treatment: CONTROL,
    label: LabelsConstants.SPLIT_NOT_FOUND,
    config: null
  };

  if (stringifiedSplit) {
    const splitJSON: ISplit = JSON.parse(stringifiedSplit);
    const split = Engine.parse(log, splitJSON, storage);
    evaluation = split.getTreatment(key, attributes, evaluateFeature);

    // If the storage is async and the evaluated split uses segment, evaluation is thenable
    if (thenable(evaluation)) {
      return evaluation.then(result => {
        result.changeNumber = split.getChangeNumber();
        result.config = splitJSON.configurations && splitJSON.configurations[result.treatment] || null;

        return result;
      });
    } else {
      evaluation.changeNumber = split.getChangeNumber(); // Always sync and optional
      evaluation.config = splitJSON.configurations && splitJSON.configurations[evaluation.treatment] || null;
    }
  }

  return evaluation;
}

function getEvaluations(
  log: ILogger,
  splitNames: string[],
  splits: Record<string, string | null>,
  key: SplitIO.SplitKey,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
): MaybeThenable<Record<string, IEvaluationResult>> {
  const result: Record<string, IEvaluationResult> = {};
  const thenables: Promise<void>[] = [];
  splitNames.forEach(splitName => {
    const evaluation = getEvaluation(
      log,
      splits[splitName],
      key,
      attributes,
      storage
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
