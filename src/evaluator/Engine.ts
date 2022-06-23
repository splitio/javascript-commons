import { get } from '../utils/lang';
import { parser } from './parser';
import { keyParser } from '../utils/key';
import { thenable } from '../utils/promise/thenable';
import * as LabelsConstants from '../utils/labels';
import { CONTROL } from '../utils/constants';
import { ISplit, MaybeThenable } from '../dtos/types';
import { SplitIO } from '../types';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { IEvaluation, IEvaluationResult, IEvaluator, ISplitEvaluator } from './types';
import { ILogger } from '../logger/types';

function evaluationResult(result: IEvaluation | undefined, defaultTreatment: string): IEvaluationResult {
  return {
    treatment: get(result, 'treatment', defaultTreatment),
    label: get(result, 'label', LabelsConstants.NO_CONDITION_MATCH)
  };
}

export class Engine {

  constructor(private baseInfo: ISplit, private evaluator: IEvaluator) {

    // in case we don't have a default treatment in the instanciation, use 'control'
    if (typeof this.baseInfo.defaultTreatment !== 'string') {
      this.baseInfo.defaultTreatment = CONTROL;
    }
  }

  static parse(log: ILogger, splitFlatStructure: ISplit, storage: IStorageSync | IStorageAsync) {
    const conditions = splitFlatStructure.conditions;
    const evaluator = parser(log, conditions, storage);

    return new Engine(splitFlatStructure, evaluator);
  }

  getKey() {
    return this.baseInfo.name;
  }

  getTreatment(key: SplitIO.SplitKey, attributes: SplitIO.Attributes | undefined, splitEvaluator: ISplitEvaluator): MaybeThenable<IEvaluationResult> {
    const {
      killed,
      seed,
      defaultTreatment,
      trafficAllocation,
      trafficAllocationSeed
    } = this.baseInfo;
    let parsedKey;
    let treatment;
    let label;

    try {
      parsedKey = keyParser(key);
    } catch (err) {
      return {
        treatment: CONTROL,
        label: LabelsConstants.EXCEPTION
      };
    }

    if (this.isGarbage()) {
      treatment = CONTROL;
      label = LabelsConstants.SPLIT_ARCHIVED;
    } else if (killed) {
      treatment = defaultTreatment;
      label = LabelsConstants.SPLIT_KILLED;
    } else {
      const evaluation = this.evaluator(
        parsedKey,
        seed,
        trafficAllocation,
        trafficAllocationSeed,
        attributes,
        splitEvaluator
      );

      // Evaluation could be async, so we should handle that case checking for a
      // thenable object
      if (thenable(evaluation)) {
        return evaluation.then(result => evaluationResult(result, defaultTreatment));
      } else {
        return evaluationResult(evaluation, defaultTreatment);
      }
    }

    return {
      treatment,
      label
    };
  }

  isGarbage() {
    return this.baseInfo.status === 'ARCHIVED';
  }

  getChangeNumber() {
    return this.baseInfo.changeNumber;
  }
}

