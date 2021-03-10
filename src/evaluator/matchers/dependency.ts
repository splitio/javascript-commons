import { IDependencyMatcherData, MaybeThenable } from '../../dtos/types';
import { IStorageAsync, IStorageSync } from '../../storages/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import thenable from '../../utils/promise/thenable';
import { IDependencyMatcherValue, IEvaluation, ISplitEvaluator } from '../types';
import { DEBUG_10, DEBUG_11 } from '../../logger/constants';

export default function dependencyMatcherContext(log: ILogger, { split, treatments }: IDependencyMatcherData, storage: IStorageSync | IStorageAsync) {

  function checkTreatment(evaluation: IEvaluation, acceptableTreatments: string[], parentName: string) {
    let matches = false;

    if (Array.isArray(acceptableTreatments)) {
      matches = acceptableTreatments.indexOf(evaluation.treatment as string) !== -1;
    }

    log.debug(DEBUG_10, [parentName, evaluation.treatment, evaluation.label, parentName, acceptableTreatments, matches]);

    return matches;
  }

  return function dependencyMatcher({ key, attributes }: IDependencyMatcherValue, splitEvaluator: ISplitEvaluator): MaybeThenable<boolean> {
    log.debug(DEBUG_11, [split, JSON.stringify(key), attributes ? '\n attributes: ' + JSON.stringify(attributes) : '']);
    const evaluation = splitEvaluator(log, key, split, attributes, storage);

    if (thenable(evaluation)) {
      return evaluation.then(ev => checkTreatment(ev, treatments, split));
    } else {
      return checkTreatment(evaluation, treatments, split);
    }
  };
}
