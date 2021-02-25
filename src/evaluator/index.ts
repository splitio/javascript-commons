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
  key: SplitIO.SplitKey,
  splitName: string,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  log: ILogger
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
      result,
      key,
      attributes,
      storage,
      log
    ));
  }

  return getEvaluation(
    stringifiedSplit,
    key,
    attributes,
    storage,
    log
  );
}

export function evaluateFeatures(
  key: SplitIO.SplitKey,
  splitNames: string[],
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  log: ILogger
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
    stringifiedSplits.then(splits => getEvaluations(splitNames, splits, key, attributes, storage, log)) :
    getEvaluations(splitNames, stringifiedSplits, key, attributes, storage, log);
}

function getEvaluation(
  stringifiedSplit: string | null,
  key: SplitIO.SplitKey,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  log: ILogger
): MaybeThenable<IEvaluationResult> {
  let evaluation: MaybeThenable<IEvaluationResult> = {
    treatment: CONTROL,
    label: LabelsConstants.SPLIT_NOT_FOUND,
    config: null
  };

  if (stringifiedSplit) {
    const splitJSON: ISplit = JSON.parse(stringifiedSplit);
    const split = Engine.parse(splitJSON, storage, log);
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
  splitNames: string[],
  splits: Record<string, string | null>,
  key: SplitIO.SplitKey,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  log: ILogger
): MaybeThenable<Record<string, IEvaluationResult>> {
  const result: Record<string, IEvaluationResult> = {};
  const thenables: Promise<void>[] = [];
  splitNames.forEach(splitName => {
    const evaluation = getEvaluation(
      splits[splitName],
      key,
      attributes,
      storage,
      log
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
