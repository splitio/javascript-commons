import { ISplit, ISplitChangesResponse, ISplitCondition, ISplitMatcher } from '../../../dtos/types';
import { IFetchDefinitionChanges, IResponse } from '../../../services/types';
import { ISplitChangesFetcher } from './types';
import SplitIO from '../../../../types/splitio';

type IConfigMatcher = {
  type: 'IS_EQUAL_TO';
  data: { type: 'NUMBER'; number: number };
  attribute?: string;
} | {
  type: 'WHITELIST';
  data: { strings: string[] };
  attribute?: string;
}

type IConfig = {
  name: string;
  variants: Array<{
    name: string;
    definition: SplitIO.JsonObject;
  }>;
  defaultVariant: string;
  changeNumber?: number;
  targeting?: {
    conditions?: Array<{
      variant: string;
      label: string;
      matchers: Array<IConfigMatcher>;
    }>
  };
}

/** Interface of the parsed JSON response of `/configs` */
export type IConfigsResponse = {
  t: number,
  s?: number,
  d: IConfig[]
}

/**
 * Factory of Configs fetcher.
 * Configs fetcher is a wrapper around `configs` API service that parses the response and handle errors.
 */
export function configsFetcherFactory(fetchConfigs: IFetchDefinitionChanges): ISplitChangesFetcher {

  return function configsFetcher(
    since: number,
    noCache?: boolean,
    till?: number,
    rbSince?: number,
    // Optional decorator for `fetchConfigs` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ): Promise<ISplitChangesResponse> {

    let configsPromise = fetchConfigs(since, noCache, till, rbSince);
    if (decorator) configsPromise = decorator(configsPromise);

    return configsPromise
      .then<IConfigsResponse>((resp: IResponse) => resp.json())
      .then(convertConfigsResponseToDefinitionChangesResponse);
  };

}

function defaultCondition(treatment: string): ISplitCondition {
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

function convertMatcher(matcher: IConfigMatcher): ISplitMatcher {
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

function convertConfigToDefinition(config: IConfig): ISplit {
  const defaultTreatment = config.defaultVariant || (config.variants && config.variants[0]?.name) || 'control';

  const configurations: Record<string, SplitIO.JsonObject> = {};
  config.variants.forEach(variant => configurations[variant.name] = variant.definition);

  const conditions: ISplitCondition[] = config.targeting?.conditions?.map(condition => ({
    conditionType: condition.matchers.some((m: IConfigMatcher) => m.type === 'WHITELIST') ? 'WHITELIST' : 'ROLLOUT',
    label: condition.label,
    matcherGroup: {
      combiner: 'AND',
      matchers: condition.matchers.map(convertMatcher),
    },
    partitions: [{ treatment: condition.variant, size: 100 }],
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

export function convertConfigsResponseToDefinitionChangesResponse(configs: IConfigsResponse): ISplitChangesResponse {
  return {
    ff: {
      s: configs.s,
      t: configs.t,
      d: configs.d.map(convertConfigToDefinition),
    },
  };
}
