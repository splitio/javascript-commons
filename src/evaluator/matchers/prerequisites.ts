import { ISplit, MaybeThenable } from '../../dtos/types';
import { IStorageAsync, IStorageSync } from '../../storages/types';
import { ILogger } from '../../logger/types';
import { thenable } from '../../utils/promise/thenable';
import { IDependencyMatcherValue, ISplitEvaluator } from '../types';

export function prerequisitesMatcherContext(prerequisites: ISplit['prerequisites'] = [], storage: IStorageSync | IStorageAsync, log: ILogger) {

  return function prerequisitesMatcher({ key, attributes }: IDependencyMatcherValue, splitEvaluator: ISplitEvaluator): MaybeThenable<boolean> {

    function evaluatePrerequisite(prerequisite: { n: string; ts: string[] }): MaybeThenable<boolean> {
      const evaluation = splitEvaluator(log, key, prerequisite.n, attributes, storage);
      return thenable(evaluation) ?
        evaluation.then(evaluation => prerequisite.ts.indexOf(evaluation.treatment!) !== -1) :
        prerequisite.ts.indexOf(evaluation.treatment!) !== -1;
    }

    return prerequisites.reduce<MaybeThenable<boolean>>((prerequisitesMet, prerequisite) => {
      return thenable(prerequisitesMet) ?
        prerequisitesMet.then(prerequisitesMet => prerequisitesMet ? evaluatePrerequisite(prerequisite) : false) :
        prerequisitesMet ? evaluatePrerequisite(prerequisite) : false;
    }, true);
  };
}
