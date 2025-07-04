import { IExcludedSegment, IRBSegment, MaybeThenable } from '../../dtos/types';
import { IStorageAsync, IStorageSync } from '../../storages/types';
import { ILogger } from '../../logger/types';
import { IDependencyMatcherValue, ISplitEvaluator } from '../types';
import { thenable } from '../../utils/promise/thenable';
import { getMatching, keyParser } from '../../utils/key';
import { parser } from '../parser';
import { STANDARD_SEGMENT, RULE_BASED_SEGMENT, LARGE_SEGMENT } from '../../utils/constants';


export function ruleBasedSegmentMatcherContext(segmentName: string, storage: IStorageSync | IStorageAsync, log: ILogger) {

  return function ruleBasedSegmentMatcher({ key, attributes }: IDependencyMatcherValue, splitEvaluator: ISplitEvaluator): MaybeThenable<boolean> {
    const matchingKey = getMatching(key);

    function matchConditions(rbsegment: IRBSegment) {
      const conditions = rbsegment.conditions || [];

      if (!conditions.length) return false;

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

    function isInExcludedSegment({ type, name }: IExcludedSegment) {
      return type === STANDARD_SEGMENT ?
        storage.segments.isInSegment(name, matchingKey) :
        type === RULE_BASED_SEGMENT ?
          ruleBasedSegmentMatcherContext(name, storage, log)({ key, attributes }, splitEvaluator) :
          type === LARGE_SEGMENT && storage.largeSegments ?
            storage.largeSegments.isInSegment(name, matchingKey) :
            false;
    }

    function isExcluded(rbSegment: IRBSegment) {
      const excluded = rbSegment.excluded || {};

      if (excluded.keys && excluded.keys.indexOf(matchingKey) !== -1) return true;

      return (excluded.segments || []).reduce<MaybeThenable<boolean>>((result, excludedSegment) => {
        return thenable(result) ?
          result.then(result => result || isInExcludedSegment(excludedSegment)) :
          result || isInExcludedSegment(excludedSegment);
      }, false);
    }

    function isInRBSegment(rbSegment: IRBSegment | null) {
      if (!rbSegment) return false;
      const excluded = isExcluded(rbSegment);

      return thenable(excluded) ?
        excluded.then(excluded => excluded ? false : matchConditions(rbSegment)) :
        excluded ? false : matchConditions(rbSegment);
    }

    const rbSegment = storage.rbSegments.get(segmentName);

    return thenable(rbSegment) ?
      rbSegment.then(isInRBSegment) :
      isInRBSegment(rbSegment);
  };
}
