import { get, isString } from '../utils/lang';
import { parser } from './parser';
import { keyParser } from '../utils/key';
import { thenable } from '../utils/promise/thenable';
import { NO_CONDITION_MATCH, SPLIT_ARCHIVED, SPLIT_KILLED } from '../utils/labels';
import { CONTROL } from '../utils/constants';
import { ISplit, MaybeThenable } from '../dtos/types';
import SplitIO from '../../types/splitio';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { IEvaluation, IEvaluationResult, ISplitEvaluator } from './types';
import { ILogger } from '../logger/types';

function evaluationResult(result: IEvaluation | undefined, defaultTreatment: string): IEvaluationResult {
  return {
    treatment: get(result, 'treatment', defaultTreatment),
    label: get(result, 'label', NO_CONDITION_MATCH)
  };
}

export function engineParser(log: ILogger, split: ISplit, storage: IStorageSync | IStorageAsync) {
  const { killed, seed, trafficAllocation, trafficAllocationSeed, status, conditions } = split;

  const defaultTreatment = isString(split.defaultTreatment) ? split.defaultTreatment : CONTROL;

  const evaluator = parser(log, conditions, storage);

  return {

    getTreatment(key: SplitIO.SplitKey, attributes: SplitIO.Attributes | undefined, splitEvaluator: ISplitEvaluator): MaybeThenable<IEvaluationResult> {

      const parsedKey = keyParser(key);

      if (status === 'ARCHIVED') return {
        treatment: CONTROL,
        label: SPLIT_ARCHIVED
      };

      if (killed) return {
        treatment: defaultTreatment,
        label: SPLIT_KILLED
      };

      const evaluation = evaluator(parsedKey, seed, trafficAllocation, trafficAllocationSeed, attributes, splitEvaluator) as MaybeThenable<IEvaluation>;

      return thenable(evaluation) ?
        evaluation.then(result => evaluationResult(result, defaultTreatment)) :
        evaluationResult(evaluation, defaultTreatment);
    }
  };

}
