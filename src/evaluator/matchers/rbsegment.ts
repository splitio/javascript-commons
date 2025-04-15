import { IRBSegment, MaybeThenable } from '../../dtos/types';
import { IStorageAsync, IStorageSync } from '../../storages/types';
import { ILogger } from '../../logger/types';
import { IDependencyMatcherValue, ISplitEvaluator } from '../types';
import { thenable } from '../../utils/promise/thenable';
import { getMatching, keyParser } from '../../utils/key';
import { parser } from '../parser';


export function ruleBasedSegmentMatcherContext(segmentName: string, storage: IStorageSync | IStorageAsync, log: ILogger) {

  return function ruleBasedSegmentMatcher({ key, attributes }: IDependencyMatcherValue, splitEvaluator: ISplitEvaluator): MaybeThenable<boolean> {

    function matchConditions(rbsegment: IRBSegment) {
      const conditions = rbsegment.conditions || [];
      const evaluator = parser(log, conditions, storage);

      const evaluation = evaluator(
        keyParser(key),
        undefined,
        undefined,
        undefined,
        attributes,
        splitEvaluator
      );

      return thenable(evaluation) ?
        evaluation.then(evaluation => evaluation ? true : false) :
        evaluation ? true : false;
    }

    function isExcluded(rbSegment: IRBSegment) {
      const matchingKey = getMatching(key);
      const excluded = rbSegment.excluded || {};

      if (excluded.keys && excluded.keys.indexOf(matchingKey) !== -1) return true;

      const isInSegment = (excluded.segments || []).map(segmentName => {
        return storage.segments.isInSegment(segmentName, matchingKey);
      });

      return isInSegment.length && thenable(isInSegment[0]) ?
        Promise.all(isInSegment).then(results => results.some(result => result)) :
        isInSegment.some(result => result);
    }

    function isInSegment(rbSegment: IRBSegment | null) {
      if (!rbSegment) return false;
      const excluded = isExcluded(rbSegment);

      return thenable(excluded) ?
        excluded.then(excluded => excluded ? false : matchConditions(rbSegment)) :
        excluded ? false : matchConditions(rbSegment);
    }

    const rbSegment = storage.rbSegments.get(segmentName);

    return thenable(rbSegment) ?
      rbSegment.then(isInSegment) :
      isInSegment(rbSegment);
  };
}
