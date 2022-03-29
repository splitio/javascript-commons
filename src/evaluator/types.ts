import { IBetweenMatcherData, IDependencyMatcherData, MaybeThenable } from '../dtos/types';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { ISet } from '../utils/lang/sets';
import { SplitIO } from '../types';
import { ILogger } from '../logger/types';

export interface IDependencyMatcherValue {
  key: SplitIO.SplitKey,
  attributes?: SplitIO.Attributes
}

export interface IMatcherDto {
  type: number
  value?: string | number | boolean | string[] | IDependencyMatcherData | ISet<string> | IBetweenMatcherData | null

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

export type IEvaluationResult = IEvaluation & { treatment: string }

export type ISplitEvaluator = (log: ILogger, key: SplitIO.SplitKey, splitName: string, attributes: SplitIO.Attributes | undefined, storage: IStorageSync | IStorageAsync) => MaybeThenable<IEvaluation>

export type IEvaluator = (key: SplitIO.SplitKey, seed: number, trafficAllocation?: number, trafficAllocationSeed?: number, attributes?: SplitIO.Attributes, splitEvaluator?: ISplitEvaluator) => MaybeThenable<IEvaluation | undefined>

export type IMatcher = (...args: any) => MaybeThenable<boolean>
