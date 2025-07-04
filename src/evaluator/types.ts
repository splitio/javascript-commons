import { IBetweenMatcherData, IBetweenStringMatcherData, IDependencyMatcherData, MaybeThenable } from '../dtos/types';
import { IStorageAsync, IStorageSync } from '../storages/types';
import SplitIO from '../../types/splitio';
import { ILogger } from '../logger/types';

export interface IDependencyMatcherValue {
  key: SplitIO.SplitKey,
  attributes?: SplitIO.Attributes
}

export interface IMatcherDto {
  type: number
  name: string
  value?: string | number | boolean | string[] | IDependencyMatcherData | IBetweenMatcherData | IBetweenStringMatcherData | null

  attribute: string | null
  negate: boolean
  dataType: string
}

export interface IEvaluation {
  treatment?: string,
  label: string,
  changeNumber?: number,
  config?: string | null
}

export type IEvaluationResult = IEvaluation & { treatment: string; impressionsDisabled?: boolean }

export type ISplitEvaluator = (log: ILogger, key: SplitIO.SplitKey, splitName: string, attributes: SplitIO.Attributes | undefined, storage: IStorageSync | IStorageAsync) => MaybeThenable<IEvaluation>

export type IEvaluator = (key: SplitIO.SplitKeyObject, seed?: number, trafficAllocation?: number, trafficAllocationSeed?: number, attributes?: SplitIO.Attributes, splitEvaluator?: ISplitEvaluator) => MaybeThenable<IEvaluation | boolean | undefined>

export type IMatcher = (value: string | number | boolean | string[] | IDependencyMatcherValue, splitEvaluator?: ISplitEvaluator) => MaybeThenable<boolean>
