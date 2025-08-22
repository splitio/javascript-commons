import { get, isString } from '../utils/lang';
import { parser } from './parser';
import { keyParser } from '../utils/key';
import { thenable } from '../utils/promise/thenable';
import { NO_CONDITION_MATCH, SPLIT_ARCHIVED, SPLIT_KILLED, PREREQUISITES_NOT_MET } from '../utils/labels';
import { CONTROL } from '../utils/constants';
import { ISplit, MaybeThenable } from '../dtos/types';
import SplitIO from '../../types/splitio';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { IEvaluation, IEvaluationResult, ISplitEvaluator } from './types';
import { ILogger } from '../logger/types';
import { ENGINE_DEFAULT } from '../logger/constants';
import { prerequisitesMatcherContext } from './matchers/prerequisites';

function evaluationResult(result: IEvaluation | undefined, defaultTreatment: string): IEvaluationResult {
  return {
    treatment: get(result, 'treatment', defaultTreatment),
    label: get(result, 'label', NO_CONDITION_MATCH)
  };
}

export function engineParser(log: ILogger, split: ISplit, storage: IStorageSync | IStorageAsync) {
  const { killed, seed, trafficAllocation, trafficAllocationSeed, status, conditions, prerequisites } = split;

  const defaultTreatment = isString(split.defaultTreatment) ? split.defaultTreatment : CONTROL;

  const evaluator = parser(log, conditions, storage);
  const prerequisiteMatcher = prerequisitesMatcherContext(prerequisites, storage, log);

  return {

    getTreatment(key: SplitIO.SplitKey, attributes: SplitIO.Attributes | undefined, splitEvaluator: ISplitEvaluator): MaybeThenable<IEvaluationResult> {

      const parsedKey = keyParser(key);

      function evaluate(prerequisitesMet: boolean) {
        if (!prerequisitesMet) {
          log.debug(ENGINE_DEFAULT, ['Prerequisite not met']);
          return {
            treatment: defaultTreatment,
            label: PREREQUISITES_NOT_MET
          };
        }

        const evaluation = evaluator(parsedKey, seed, trafficAllocation, trafficAllocationSeed, attributes, splitEvaluator) as MaybeThenable<IEvaluation>;

        return thenable(evaluation) ?
          evaluation.then(result => evaluationResult(result, defaultTreatment)) :
          evaluationResult(evaluation, defaultTreatment);
      }

      if (status === 'ARCHIVED') return {
        treatment: CONTROL,
        label: SPLIT_ARCHIVED
      };

      if (killed) {
        log.debug(ENGINE_DEFAULT, ['Flag is killed']);
        return {
          treatment: defaultTreatment,
          label: SPLIT_KILLED
        };
      }

      const prerequisitesMet = prerequisiteMatcher({ key, attributes }, splitEvaluator);

      return thenable(prerequisitesMet) ?
        prerequisitesMet.then(evaluate) :
        evaluate(prerequisitesMet);
    }
  };

}
