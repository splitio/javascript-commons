import { IDefinition, IDefinitionChangesResponse, IDefinitionCondition, IDefinitionMatcher } from '../../../dtos/types';
import { IResponse } from '../../../services/types';
import { IDefinitionChangesFetcher } from './types';
import SplitIO from '../../../../types/splitio';
import { ISdkFactoryContextSync } from '../../../sdkFactory/types';

type IConfigMatcher = {
  type: 'IS_EQUAL_TO';
  data: { type: 'NUMBER'; number: number };
  attribute?: string;
} | {
  type: 'WHITELIST';
  data: { strings: string[] };
  attribute?: string;
}

interface IConfigPartition {
  variant: string
  size: number
}

interface IConfig {
  name: string;
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

function convertMatcher(matcher: IConfigMatcher): IDefinitionMatcher {
  const keySelector = matcher.attribute ? { trafficType: 'user', attribute: matcher.attribute } : null;

  switch (matcher.type) {
    case 'IS_EQUAL_TO':
      return {
        matcherType: 'EQUAL_TO',
        negate: false,
        keySelector,
        unaryNumericMatcherData: { dataType: matcher.data.type, value: matcher.data.number },
      };
    case 'WHITELIST':
      return {
        matcherType: 'WHITELIST',
        negate: false,
        keySelector,
        whitelistMatcherData: { whitelist: matcher.data.strings },
      };
  }
}

function convertConfigToDefinition(config: IConfig): IDefinition {
  const defaultTreatment = config.targeting?.default || config.variants[0]?.name || 'control';

  const configurations: Record<string, SplitIO.JsonObject> = {};
  config.variants.forEach(variant => configurations[variant.name] = variant.definition);

  const conditions: IDefinitionCondition[] = config.targeting?.conditions?.map(condition => ({
    conditionType: condition.matchers.some((m: IConfigMatcher) => m.type === 'WHITELIST') ? 'WHITELIST' : 'ROLLOUT',
    label: condition.label,
    matcherGroup: {
      combiner: 'AND',
      matchers: condition.matchers.map(convertMatcher),
    },
    partitions: condition.partitions.map(partition => ({ treatment: partition.variant, size: partition.size })),
  })) || [];

  conditions.push(defaultCondition(defaultTreatment));

  return {
    name: config.name,
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
