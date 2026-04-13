import SplitIO from '../../types/splitio';

export type MaybeThenable<T> = T | Promise<T>

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

export interface IBetweenStringMatcherData {
  start: string
  end: string
}

export interface IWhitelistMatcherData {
  whitelist?: string[] | null
}

export interface IInSegmentMatcherData {
  segmentName: string
}

export interface IInLargeSegmentMatcherData {
  largeSegmentName: string
}

export interface IDependencyMatcherData {
  split: string,
  treatments: string[]
}

interface IDefinitionMatcherBase {
  matcherType: string
  negate?: boolean
  keySelector?: null | {
    trafficType: string,
    attribute?: string | null
  }
  userDefinedSegmentMatcherData?: null | IInSegmentMatcherData
  userDefinedLargeSegmentMatcherData?: null | IInLargeSegmentMatcherData
  whitelistMatcherData?: null | IWhitelistMatcherData
  unaryNumericMatcherData?: null | IUnaryNumericMatcherData
  betweenMatcherData?: null | IBetweenMatcherData
  dependencyMatcherData?: null | IDependencyMatcherData
  booleanMatcherData?: null | boolean
  stringMatcherData?: null | string
  betweenStringMatcherData?: null | IBetweenStringMatcherData
}

interface IAllKeysMatcher extends IDefinitionMatcherBase {
  matcherType: 'ALL_KEYS'
}

interface IInSegmentMatcher extends IDefinitionMatcherBase {
  matcherType: 'IN_SEGMENT',
  userDefinedSegmentMatcherData: IInSegmentMatcherData
}

interface IInRBSegmentMatcher extends IDefinitionMatcherBase {
  matcherType: 'IN_RULE_BASED_SEGMENT',
  userDefinedSegmentMatcherData: IInSegmentMatcherData
}

interface IInLargeSegmentMatcher extends IDefinitionMatcherBase {
  matcherType: 'IN_LARGE_SEGMENT',
  userDefinedLargeSegmentMatcherData: IInLargeSegmentMatcherData
}

interface IWhitelistMatcher extends IDefinitionMatcherBase {
  matcherType: 'WHITELIST',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IEqualToMatcher extends IDefinitionMatcherBase {
  matcherType: 'EQUAL_TO',
  unaryNumericMatcherData: IUnaryNumericMatcherData
}

interface IGreaterThanOrEqualToMatcher extends IDefinitionMatcherBase {
  matcherType: 'GREATER_THAN_OR_EQUAL_TO',
  unaryNumericMatcherData: IUnaryNumericMatcherData
}

interface ILessThanOrEqualToMatcher extends IDefinitionMatcherBase {
  matcherType: 'LESS_THAN_OR_EQUAL_TO',
  unaryNumericMatcherData: IUnaryNumericMatcherData
}

interface IBetweenMatcher extends IDefinitionMatcherBase {
  matcherType: 'BETWEEN'
  betweenMatcherData: IBetweenMatcherData
}

interface IEqualToSetMatcher extends IDefinitionMatcherBase {
  matcherType: 'EQUAL_TO_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IContainsAnyOfSetMatcher extends IDefinitionMatcherBase {
  matcherType: 'CONTAINS_ANY_OF_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IContainsAllOfSetMatcher extends IDefinitionMatcherBase {
  matcherType: 'CONTAINS_ALL_OF_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IPartOfSetMatcher extends IDefinitionMatcherBase {
  matcherType: 'PART_OF_SET',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IStartsWithMatcher extends IDefinitionMatcherBase {
  matcherType: 'STARTS_WITH',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IEndsWithMatcher extends IDefinitionMatcherBase {
  matcherType: 'ENDS_WITH',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IContainsStringMatcher extends IDefinitionMatcherBase {
  matcherType: 'CONTAINS_STRING',
  whitelistMatcherData: IWhitelistMatcherData
}

interface IInSplitTreatmentMatcher extends IDefinitionMatcherBase {
  matcherType: 'IN_SPLIT_TREATMENT',
  dependencyMatcherData: IDependencyMatcherData,
}

interface IEqualToBooleanMatcher extends IDefinitionMatcherBase {
  matcherType: 'EQUAL_TO_BOOLEAN',
  booleanMatcherData: boolean
}

interface IMatchesStringMatcher extends IDefinitionMatcherBase {
  matcherType: 'MATCHES_STRING',
  stringMatcherData: string
}

interface IEqualToSemverMatcher extends IDefinitionMatcherBase {
  matcherType: 'EQUAL_TO_SEMVER',
  stringMatcherData: string
}

interface IGreaterThanOrEqualToSemverMatcher extends IDefinitionMatcherBase {
  matcherType: 'GREATER_THAN_OR_EQUAL_TO_SEMVER',
  stringMatcherData: string
}


interface ILessThanOrEqualToSemverMatcher extends IDefinitionMatcherBase {
  matcherType: 'LESS_THAN_OR_EQUAL_TO_SEMVER',
  stringMatcherData: string
}

interface IBetweenSemverMatcher extends IDefinitionMatcherBase {
  matcherType: 'BETWEEN_SEMVER'
  betweenStringMatcherData: IBetweenStringMatcherData
}

interface IInListSemverMatcher extends IDefinitionMatcherBase {
  matcherType: 'IN_LIST_SEMVER',
  whitelistMatcherData: IWhitelistMatcherData
}

export type IDefinitionMatcher = IAllKeysMatcher | IInSegmentMatcher | IWhitelistMatcher | IEqualToMatcher | IGreaterThanOrEqualToMatcher |
  ILessThanOrEqualToMatcher | IBetweenMatcher | IEqualToSetMatcher | IContainsAnyOfSetMatcher | IContainsAllOfSetMatcher | IPartOfSetMatcher |
  IStartsWithMatcher | IEndsWithMatcher | IContainsStringMatcher | IInSplitTreatmentMatcher | IEqualToBooleanMatcher | IMatchesStringMatcher |
  IEqualToSemverMatcher | IGreaterThanOrEqualToSemverMatcher | ILessThanOrEqualToSemverMatcher | IBetweenSemverMatcher | IInListSemverMatcher |
  IInLargeSegmentMatcher | IInRBSegmentMatcher

export interface IDefinitionPartition {
  treatment: string
  size: number
}

export interface IDefinitionCondition {
  matcherGroup: {
    combiner: 'AND',
    matchers: IDefinitionMatcher[]
  }
  partitions?: IDefinitionPartition[]
  label?: string
  conditionType?: 'ROLLOUT' | 'WHITELIST'
}

export interface IExcludedSegment {
  type: 'standard' | 'large' | 'rule-based',
  name: string,
}

export interface TargetingEntity {
  name: string;
  changeNumber: number;
  status: 'ACTIVE' | 'ARCHIVED';
  conditions: IDefinitionCondition[];
}

export interface IRBSegment extends TargetingEntity {
  excluded?: {
    keys?: string[] | null,
    segments?: IExcludedSegment[] | null
  } | null
}

export interface IDefinition extends TargetingEntity {
  trafficTypeName: string;
  sets?: string[];
  impressionsDisabled?: boolean;
  version?: number;
  prerequisites?: null | {
    n: string,
    ts: string[]
  }[];
  killed: boolean;
  defaultTreatment: string;
  seed: number;
  trafficAllocation?: number;
  trafficAllocationSeed?: number;
  configurations?: {
    [treatmentName: string]: string | SplitIO.JsonObject
  };
}

/** Interface of the parsed JSON response of `/splitChanges` */
export interface IDefinitionChangesResponse {
  ff?: {
    t: number,
    s?: number,
    d: IDefinition[]
  },
  rbs?: {
    t: number,
    s?: number,
    d: IRBSegment[]
  }
}

/** Interface of the parsed JSON response of `/segmentChanges/{segmentName}` */
export interface ISegmentChangesResponse {
  name: string,
  added: string[],
  removed: string[],
  since: number,
  till: number
}

export interface IMySegmentsResponse {
  cn?: number,
  k?: {
    n: string
  }[]
}

/** Interface of the parsed JSON response of `/memberships/{userKey}` */
export interface IMembershipsResponse {
  ms?: IMySegmentsResponse,
  ls?: IMySegmentsResponse
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
  validFilters: SplitIO.SplitFilter[],
};
