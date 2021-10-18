import { SplitIO } from '../types';

export type MaybeThenable<T> = T | Promise<T>

/** Split Matchers */

export type IMatcherDataType = null | 'DATETIME' | 'NUMBER'

export interface IUnaryNumericMatcherData {
  dataType: IMatcherDataType
  value: number
}

export interface IBetweenMatcherData {
  dataType: IMatcherDataType
  start: number
  end: number
}

export interface IWhitelistMatcherData {
  whitelist: string[]
}

export interface IInSegmentMatcherData {
  segmentName: string
}

export interface IDependencyMatcherData {
  split: string,
  treatments: string[]
}

interface ISplitMatcherBase {
  matcherType: string
  negate: boolean
  keySelector: null | {
    trafficType: string,
    attribute: string | null
  }
  userDefinedSegmentMatcherData?: null | IInSegmentMatcherData
  whitelistMatcherData?: null | IWhitelistMatcherData
  unaryNumericMatcherData?: null | IUnaryNumericMatcherData
  betweenMatcherData?: null | IBetweenMatcherData
  dependencyMatcherData?: null | IDependencyMatcherData
  booleanMatcherData?: null | boolean
  stringMatcherData?: null | string
}

interface IAllKeysMatcher extends ISplitMatcherBase {
  matcherType: 'ALL_KEYS'
}

interface IInSegmentMatcher extends ISplitMatcherBase {
  matcherType: 'IN_SEGMENT',
  userDefinedSegmentMatcherData: IInSegmentMatcherData
}

interface IWhitelistMatcher extends ISplitMatcherBase {
  matcherType: 'WHITELIST',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IEqualToMatcher extends ISplitMatcherBase {
  matcherType: 'EQUAL_TO',
  unaryNumericMatcherData: IUnaryNumericMatcherData
}

interface IGreaterThanOrEqualToMatcher extends ISplitMatcherBase {
  matcherType: 'GREATER_THAN_OR_EQUAL_TO',
  unaryNumericMatcherData: IUnaryNumericMatcherData
}

interface ILessThanOrEqualToMatcher extends ISplitMatcherBase {
  matcherType: 'LESS_THAN_OR_EQUAL_TO',
  unaryNumericMatcherData: IUnaryNumericMatcherData
}

interface IBetweenMatcher extends ISplitMatcherBase {
  matcherType: 'BETWEEN'
  betweenMatcherData: IBetweenMatcherData
}

interface IEqualToSetMatcher extends ISplitMatcherBase {
  matcherType: 'EQUAL_TO_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IContainsAnyOfSetMatcher extends ISplitMatcherBase {
  matcherType: 'CONTAINS_ANY_OF_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IContainsAllOfSetMatcher extends ISplitMatcherBase {
  matcherType: 'CONTAINS_ALL_OF_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IPartOfSetMatcher extends ISplitMatcherBase {
  matcherType: 'PART_OF_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IStartsWithMatcher extends ISplitMatcherBase {
  matcherType: 'STARTS_WITH',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IEndsWithMatcher extends ISplitMatcherBase {
  matcherType: 'ENDS_WITH',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IContainsStringMatcher extends ISplitMatcherBase {
  matcherType: 'CONTAINS_STRING',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IInSplitTreatmentMatcher extends ISplitMatcherBase {
  matcherType: 'IN_SPLIT_TREATMENT',
  dependencyMatcherData: IDependencyMatcherData,
}

interface IEqualToBooleanMatcher extends ISplitMatcherBase {
  matcherType: 'EQUAL_TO_BOOLEAN',
  booleanMatcherData: boolean
}

interface IMatchesStringMatcher extends ISplitMatcherBase {
  matcherType: 'MATCHES_STRING',
  stringMatcherData: string
}

export type ISplitMatcher = IAllKeysMatcher | IInSegmentMatcher | IWhitelistMatcher | IEqualToMatcher | IGreaterThanOrEqualToMatcher |
  ILessThanOrEqualToMatcher | IBetweenMatcher | IEqualToSetMatcher | IContainsAnyOfSetMatcher | IContainsAllOfSetMatcher | IPartOfSetMatcher |
  IStartsWithMatcher | IEndsWithMatcher | IContainsStringMatcher | IInSplitTreatmentMatcher | IEqualToBooleanMatcher | IMatchesStringMatcher

/** Split object */
export interface ISplitPartition {
  treatment: string
  size: number
}

export interface ISplitCondition {
  matcherGroup: {
    combiner: 'AND',
    matchers: ISplitMatcher[]
  }
  partitions: ISplitPartition[]
  label: string
  conditionType: 'ROLLOUT' | 'WHITELIST'
}

export interface ISplit {
  name: string,
  changeNumber: number,
  killed: boolean,
  defaultTreatment: string,
  trafficTypeName: string,
  conditions: ISplitCondition[],
  status: 'ACTIVE' | 'ARCHIVED',
  seed: number,
  trafficAllocation?: number,
  trafficAllocationSeed?: number
  configurations?: {
    [treatmentName: string]: string
  }
}

// Split definition used in offline mode
export type ISplitPartial = Pick<ISplit, 'conditions' | 'configurations' | 'trafficTypeName'>

/** Interface of the parsed JSON response of `/splitChanges` */
export interface ISplitChangesResponse {
  till: number,
  splits: ISplit[]
}

/** Interface of the parsed JSON response of `/segmentChanges/{segmentName}` */
export interface ISegmentChangesResponse {
  name: string,
  added: string[],
  removed: string[],
  since: number,
  till: number
}

export interface IMySegmentsResponseItem {
  id: string,
  name: string
}

/** Interface of the parsed JSON response of `/mySegments/{userKey}` */
export interface IMySegmentsResponse {
  mySegments: IMySegmentsResponseItem[]
}

/** Metadata internal type for storages */

export interface IMetadata {
  /** SDK version */
  s: string
  /** host IP */
  i: string
  /** host name */
  n: string
}

export type ISplitFiltersValidation = {
  queryString: string | null,
  groupedFilters: Record<SplitIO.SplitFilterType, string[]>,
  validFilters: SplitIO.SplitFilter[]
};
