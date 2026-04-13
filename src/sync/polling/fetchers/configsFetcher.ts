import { IDefinition, IDefinitionChangesResponse, IDefinitionCondition, IDefinitionMatcher } from '../../../dtos/types';
import { IResponse } from '../../../services/types';
import { IDefinitionChangesFetcher } from './types';
import SplitIO from '../../../../types/splitio';
import { ISdkFactoryContextSync } from '../../../sdkFactory/types';

type IConfigMatcherDataType = 'DATETIME' | 'NUMBER'

interface IConfigMatcherBase {
  type: string;
  attribute?: string | null;
  data?:
  { type?: IConfigMatcherDataType; number: number } |
  { type?: IConfigMatcherDataType; start: number; end: number } |
  { strings: string[] } |
  { name: string } |
  { config: string; variants: string[] } |
  { value: boolean } |
  { string: string } |
  { start: string; end: string }
}

interface IAllKeysConfigMatcher extends IConfigMatcherBase {
  type: 'ALL_KEYS'
}

interface IWhitelistConfigMatcher extends IConfigMatcherBase {
  type: 'WHITELIST',
  data: { strings: string[] }
}

interface IEqualToConfigMatcher extends IConfigMatcherBase {
  type: 'EQUAL_TO';
  data: { type?: IConfigMatcherDataType; number: number };
}

interface IGreaterThanOrEqualToConfigMatcher extends IConfigMatcherBase {
  type: 'GREATER_THAN_OR_EQUAL_TO';
  data: { type?: IConfigMatcherDataType; number: number };
}

interface ILessThanOrEqualToConfigMatcher extends IConfigMatcherBase {
  type: 'LESS_THAN_OR_EQUAL_TO';
  data: { type?: IConfigMatcherDataType; number: number };
}

interface IBetweenConfigMatcher extends IConfigMatcherBase {
  type: 'BETWEEN';
  data: { type?: IConfigMatcherDataType; start: number; end: number };
}

interface IInSegmentConfigMatcher extends IConfigMatcherBase {
  type: 'IN_SEGMENT';
  data: { name: string };
}

interface IInRBSegmentConfigMatcher extends IConfigMatcherBase {
  type: 'IN_RULE_BASED_SEGMENT';
  data: { name: string };
}

interface IInLargeSegmentConfigMatcher extends IConfigMatcherBase {
  type: 'IN_LARGE_SEGMENT';
  data: { name: string };
}

interface IEqualToSetConfigMatcher extends IConfigMatcherBase {
  type: 'EQUAL_TO_SET';
  data: { strings: string[] };
}

interface IContainsAnyOfSetConfigMatcher extends IConfigMatcherBase {
  type: 'CONTAINS_ANY_OF_SET';
  data: { strings: string[] };
}

interface IContainsAllOfSetConfigMatcher extends IConfigMatcherBase {
  type: 'CONTAINS_ALL_OF_SET';
  data: { strings: string[] };
}

interface IPartOfSetConfigMatcher extends IConfigMatcherBase {
  type: 'PART_OF_SET';
  data: { strings: string[] };
}

interface IStartsWithConfigMatcher extends IConfigMatcherBase {
  type: 'STARTS_WITH';
  data: { strings: string[] };
}

interface IEndsWithConfigMatcher extends IConfigMatcherBase {
  type: 'ENDS_WITH';
  data: { strings: string[] };
}

interface IContainsStringConfigMatcher extends IConfigMatcherBase {
  type: 'CONTAINS_STRING';
  data: { strings: string[] };
}

interface IInListSemverConfigMatcher extends IConfigMatcherBase {
  type: 'IN_LIST_SEMVER';
  data: { strings: string[] };
}

interface IInConfigVariantConfigMatcher extends IConfigMatcherBase {
  type: 'IN_CONFIG_VARIANT';
  data: { config: string; variants: string[] };
}

interface IEqualToBooleanConfigMatcher extends IConfigMatcherBase {
  type: 'EQUAL_TO_BOOLEAN';
  data: { value: boolean };
}

interface IMatchesStringConfigMatcher extends IConfigMatcherBase {
  type: 'MATCHES_STRING';
  data: { string: string };
}

interface IEqualToSemverConfigMatcher extends IConfigMatcherBase {
  type: 'EQUAL_TO_SEMVER';
  data: { string: string };
}

interface IGreaterThanOrEqualToSemverConfigMatcher extends IConfigMatcherBase {
  type: 'GREATER_THAN_OR_EQUAL_TO_SEMVER';
  data: { string: string };
}

interface ILessThanOrEqualToSemverConfigMatcher extends IConfigMatcherBase {
  type: 'LESS_THAN_OR_EQUAL_TO_SEMVER';
  data: { string: string };
}

interface IBetweenSemverConfigMatcher extends IConfigMatcherBase {
  type: 'BETWEEN_SEMVER';
  data: { start: string; end: string };
}

type IConfigMatcher = IAllKeysConfigMatcher | IInSegmentConfigMatcher | IWhitelistConfigMatcher | IEqualToConfigMatcher | IGreaterThanOrEqualToConfigMatcher |
  ILessThanOrEqualToConfigMatcher | IBetweenConfigMatcher | IEqualToSetConfigMatcher | IContainsAnyOfSetConfigMatcher | IContainsAllOfSetConfigMatcher | IPartOfSetConfigMatcher |
  IStartsWithConfigMatcher | IEndsWithConfigMatcher | IContainsStringConfigMatcher | IInConfigVariantConfigMatcher | IEqualToBooleanConfigMatcher | IMatchesStringConfigMatcher |
  IEqualToSemverConfigMatcher | IGreaterThanOrEqualToSemverConfigMatcher | ILessThanOrEqualToSemverConfigMatcher | IBetweenSemverConfigMatcher | IInListSemverConfigMatcher |
  IInLargeSegmentConfigMatcher | IInRBSegmentConfigMatcher

interface IConfigPartition {
  variant: string
  size: number
}

interface IConfig {
  identifier: string;
  variants: Array<{
    name: string;
    definition: SplitIO.JsonObject;
  }>;
  changeNumber: number;
  trafficTypeName?: string;
  version?: number;
  status?: 'ACTIVE' | 'ARCHIVED';
  killed?: boolean;
  sets?: string[];
  targeting?: {
    default?: string;
    seed?: number;
    trafficAllocation?: number,
    trafficAllocationSeed?: number,
    conditions?: Array<{
      type?: 'ROLLOUT' | 'WHITELIST';
      label: string;
      partitions: Array<IConfigPartition>;
      matchers: Array<IConfigMatcher>;
    }>
  };
}

/** Interface of the parsed JSON response of `/configs` */
export interface IConfigsResponse {
  till: number,
  since?: number,
  updated: IConfig[]
}

/**
 * Factory of Configs fetcher.
 * Configs fetcher is a wrapper around `configs` API service that parses the response and handle errors.
 */
export function configsFetcherFactory(params: ISdkFactoryContextSync): IDefinitionChangesFetcher {
  const fetchConfigs = params.splitApi.fetchConfigs;

  function configsFetcher(
    since: number,
    noCache?: boolean,
    till?: number,
    rbSince?: number,
    // Optional decorator for `fetchConfigs` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ): Promise<IDefinitionChangesResponse> {

    let configsPromise = fetchConfigs(since, noCache, till, rbSince);
    if (decorator) configsPromise = decorator(configsPromise);

    return configsPromise
      .then<IConfigsResponse>((resp: IResponse) => resp.json())
      .then(convertConfigsResponseToDefinitionChangesResponse);
  }

  configsFetcher.type = 'configs' as const;
  return configsFetcher;
}

function defaultCondition(treatment: string): IDefinitionCondition {
  return {
    conditionType: 'ROLLOUT',
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: null,
        matcherType: 'ALL_KEYS',
        negate: false
      }],
    },
    partitions: [{ treatment, size: 100 }],
    label: 'default rule',
  };
}

const wl = (d: { strings: string[] }) => ({ whitelistMatcherData: { whitelist: d.strings } });
const num = (d: { type?: IConfigMatcherDataType; number: number }) => ({ unaryNumericMatcherData: { dataType: d.type || 'NUMBER', value: d.number } });
const seg = (d: { name: string }) => ({ userDefinedSegmentMatcherData: { segmentName: d.name } });
const str = (d: { string: string }) => ({ stringMatcherData: d.string });

const MATCHER_CONVERTERS: Record<IConfigMatcher['type'], (data: any) => Record<string, any>> = {
  ALL_KEYS: () => ({}),
  IN_SEGMENT: seg, IN_RULE_BASED_SEGMENT: seg,
  IN_LARGE_SEGMENT: (d) => ({ userDefinedLargeSegmentMatcherData: { largeSegmentName: d.name } }),
  WHITELIST: wl, EQUAL_TO_SET: wl, CONTAINS_ANY_OF_SET: wl, CONTAINS_ALL_OF_SET: wl,
  PART_OF_SET: wl, STARTS_WITH: wl, ENDS_WITH: wl, CONTAINS_STRING: wl, IN_LIST_SEMVER: wl,
  EQUAL_TO: num, GREATER_THAN_OR_EQUAL_TO: num, LESS_THAN_OR_EQUAL_TO: num,
  BETWEEN: (d) => ({ betweenMatcherData: { dataType: d.type || 'NUMBER', start: d.start, end: d.end } }),
  IN_CONFIG_VARIANT: (d) => ({ dependencyMatcherData: { split: d.config, treatments: d.variants } }),
  EQUAL_TO_BOOLEAN: (d) => ({ booleanMatcherData: d.value }),
  MATCHES_STRING: str, EQUAL_TO_SEMVER: str, GREATER_THAN_OR_EQUAL_TO_SEMVER: str, LESS_THAN_OR_EQUAL_TO_SEMVER: str,
  BETWEEN_SEMVER: (d) => ({ betweenStringMatcherData: { start: d.start, end: d.end } }),
};

function convertMatcher(matcher: IConfigMatcher): IDefinitionMatcher {
  const keySelector = matcher.attribute ? { trafficType: 'user', attribute: matcher.attribute } : null;
  return {
    matcherType: matcher.type,
    negate: false,
    keySelector,
    ...MATCHER_CONVERTERS[matcher.type](matcher.data),
  } as IDefinitionMatcher;
}

function convertConfigToDefinition(config: IConfig): IDefinition {
  const defaultTreatment = config.targeting?.default || config.variants[0]?.name || 'control';

  const configurations: Record<string, SplitIO.JsonObject> = {};
  config.variants.forEach(variant => configurations[variant.name] = variant.definition);

  const conditions: IDefinitionCondition[] = config.targeting?.conditions?.map(condition => ({
    conditionType: condition.type || (condition.matchers.some((m: IConfigMatcher) => m.type === 'WHITELIST') ? 'WHITELIST' : 'ROLLOUT'),
    label: condition.label,
    matcherGroup: {
      combiner: 'AND',
      matchers: condition.matchers.map(convertMatcher),
    },
    partitions: condition.partitions.map(partition => ({ treatment: partition.variant, size: partition.size })),
  })) || [];

  // only add default condition if there is no a last condition with matcher type ALL_KEYS
  if (!conditions.some(condition => condition.matcherGroup.matchers.some(matcher => matcher.matcherType === 'ALL_KEYS'))) {
    conditions.push(defaultCondition(defaultTreatment));
  }

  return {
    name: config.identifier,
    changeNumber: config.changeNumber || 0,
    status: 'ACTIVE',
    conditions,
    killed: false,
    defaultTreatment,
    trafficTypeName: 'user',
    seed: 0,
    configurations,
  };
}

export function convertConfigsResponseToDefinitionChangesResponse(configs: IConfigsResponse): IDefinitionChangesResponse {
  return {
    ff: {
      s: configs.since,
      t: configs.till,
      d: configs.updated.map(convertConfigToDefinition),
    },
  };
}
