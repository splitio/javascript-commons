import { getTreatment, shouldApplyRollout } from './engineUtils';
import { thenable } from '../../utils/promise/thenable';
import * as LabelsConstants from '../../utils/labels';
import { MaybeThenable } from '../../dtos/types';
import { IEvaluation, IEvaluator, ISplitEvaluator } from '../types';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';

// Build Evaluation object if and only if matchingResult is true
function match(log: ILogger, matchingResult: boolean, bucketingKey: string | undefined, seed: number, treatments: { getTreatmentFor: (x: number) => string }, label: string): IEvaluation | undefined {
  if (matchingResult) {
    const treatment = getTreatment(log, bucketingKey as string, seed, treatments);

    return {
      treatment,
      label
    };
  }

  // else we should notify the engine to continue evaluating
  return undefined;
}

// Condition factory
export function conditionContext(log: ILogger, matcherEvaluator: (...args: any) => MaybeThenable<boolean>, treatments: { getTreatmentFor: (x: number) => string }, label: string, conditionType: 'ROLLOUT' | 'WHITELIST'): IEvaluator {

  return function conditionEvaluator(key: SplitIO.SplitKey, seed: number, trafficAllocation?: number, trafficAllocationSeed?: number, attributes?: SplitIO.Attributes, splitEvaluator?: ISplitEvaluator) {

    // Whitelisting has more priority than traffic allocation, so we don't apply this filtering to those conditions.
    if (conditionType === 'ROLLOUT' && !shouldApplyRollout(trafficAllocation as number, (key as SplitIO.SplitKeyObject).bucketingKey as string, trafficAllocationSeed as number)) {
      return {
        treatment: undefined, // treatment value is assigned later
        label: LabelsConstants.NOT_IN_SPLIT
      };
    }

    // matcherEvaluator could be Async, this relays on matchers return value, so we need
    // to verify for thenable before play with the result.
    // Also, we pass splitEvaluator function in case we have a matcher that needs to evaluate another split,
    // as well as the entire key object for the same reason.
    const matches = matcherEvaluator(key, attributes, splitEvaluator);

    if (thenable(matches)) {
      return matches.then(result => match(log, result, (key as SplitIO.SplitKeyObject).bucketingKey, seed, treatments, label));
    }

    return match(log, matches, (key as SplitIO.SplitKeyObject).bucketingKey, seed, treatments, label);
  };

}
