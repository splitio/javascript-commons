import Engine from './Engine';
import thenable from '../utils/promise/thenable';
import * as LabelsConstants from '../utils/labels';
import { get } from '../utils/lang';
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
    // the only scenario where getSplit can throw an error is when the storage
    // is redis and there is a connection issue and we can't retrieve the split
    // to be evaluated
    return Promise.resolve(treatmentException);
  }

  if (thenable(stringifiedSplit)) {
    return stringifiedSplit.then((result) => getEvaluation(
      log,
      result,
      key,
      attributes,
      storage,
    ));
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
  const evaluations: Record<string, IEvaluationResult> = {};

  try {
    stringifiedSplits = storage.splits.getSplits(splitNames);
  } catch (e) {
    // the only scenario where `getSplits` can throw an error is when the storage
    // is redis and there is a connection issue and we can't retrieve the split
    // to be evaluated
    splitNames.forEach(splitName => {
      evaluations[splitName] = treatmentException;
    });
    return Promise.resolve(evaluations);
  }

  return (thenable(stringifiedSplits)) ?
    stringifiedSplits.then(splits => getEvaluations(log, splitNames, splits, key, attributes, storage)) :
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

    // If the storage is async, evaluation and changeNumber will return a thenable
    if (thenable(evaluation)) {
      return evaluation.then(result => {
        result.changeNumber = split.getChangeNumber();
        result.config = get(splitJSON, `configurations.${result.treatment}`, null);

        return result;
      });
    } else {
      evaluation.changeNumber = split.getChangeNumber(); // Always sync and optional
      evaluation.config = get(splitJSON, `configurations.${evaluation.treatment}`, null);
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
