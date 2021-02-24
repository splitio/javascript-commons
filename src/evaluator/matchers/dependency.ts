import { IDependencyMatcherData, MaybeThenable } from '../../dtos/types';
import { logFactory } from '../../logger/sdkLogger';
import { IStorageAsync, IStorageSync } from '../../storages/types';
const log = logFactory('splitio-engine:matcher');
import thenable from '../../utils/promise/thenable';
import { IDependencyMatcherValue, IEvaluation, ISplitEvaluator } from '../types';

function checkTreatment(evaluation: IEvaluation, acceptableTreatments: string[], parentName: string) {
  let matches = false;

  if (Array.isArray(acceptableTreatments)) {
    matches = acceptableTreatments.indexOf(evaluation.treatment as string) !== -1;
  }

  log.d(`[dependencyMatcher] Parent split "${parentName}" evaluated to "${evaluation.treatment}" with label "${evaluation.label}". ${parentName} evaluated treatment is part of [${acceptableTreatments}] ? ${matches}.`);

  return matches;
}

export default function dependencyMatcherContext({ split, treatments }: IDependencyMatcherData, storage: IStorageSync | IStorageAsync) {

  return function dependencyMatcher({ key, attributes }: IDependencyMatcherValue, splitEvaluator: ISplitEvaluator): MaybeThenable<boolean> {
    log.d(`[dependencyMatcher] will evaluate parent split: "${split}" with key: ${JSON.stringify(key)} ${attributes ? `\n attributes: ${JSON.stringify(attributes)}` : ''}`);
    const evaluation = splitEvaluator(key, split, attributes, storage);

    if (thenable(evaluation)) {
      return evaluation.then(ev => checkTreatment(ev, treatments, split));
    } else {
      return checkTreatment(evaluation, treatments, split);
    }
  };
}
