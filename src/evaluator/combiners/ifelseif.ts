import { findIndex } from '../../utils/lang';
import { ILogger } from '../../logger/types';
import { thenable } from '../../utils/promise/thenable';
import * as LabelsConstants from '../../utils/labels';
import { CONTROL } from '../../utils/constants';
import { SplitIO } from '../../types';
import { IEvaluation, IEvaluator, ISplitEvaluator } from '../types';
import { ENGINE_COMBINER_IFELSEIF, ENGINE_COMBINER_IFELSEIF_NO_TREATMENT, ERROR_ENGINE_COMBINER_IFELSEIF } from '../../logger/constants';

export function ifElseIfCombinerContext(log: ILogger, predicates: IEvaluator[]): IEvaluator {

  function unexpectedInputHandler() {
    log.error(ERROR_ENGINE_COMBINER_IFELSEIF);

    return {
      treatment: CONTROL,
      label: LabelsConstants.EXCEPTION
    };
  }

  function computeTreatment(predicateResults: Array<IEvaluation | undefined>) {
    const len = predicateResults.length;

    for (let i = 0; i < len; i++) {
      const evaluation = predicateResults[i];

      if (evaluation !== undefined) {
        log.debug(ENGINE_COMBINER_IFELSEIF, [evaluation.treatment]);

        return evaluation;
      }
    }

    log.debug(ENGINE_COMBINER_IFELSEIF_NO_TREATMENT);
    return undefined;
  }

  function ifElseIfCombiner(key: SplitIO.SplitKey, seed: number, trafficAllocation?: number, trafficAllocationSeed?: number, attributes?: SplitIO.Attributes, splitEvaluator?: ISplitEvaluator) {
    // In Async environments we are going to have async predicates. There is none way to know
    // before hand so we need to evaluate all the predicates, verify for thenables, and finally,
    // define how to return the treatment (wrap result into a Promise or not).
    const predicateResults = predicates.map(evaluator => evaluator(key, seed, trafficAllocation, trafficAllocationSeed, attributes, splitEvaluator));

    // if we find a thenable
    if (findIndex(predicateResults, thenable) !== -1) {
      return Promise.all(predicateResults).then(results => computeTreatment(results));
    }

    return computeTreatment(predicateResults as IEvaluation[]);
  }

  // if there is none predicates, then there was an error in parsing phase
  if (!Array.isArray(predicates) || Array.isArray(predicates) && predicates.length === 0) {
    return unexpectedInputHandler;
  } else {
    return ifElseIfCombiner;
  }
}
