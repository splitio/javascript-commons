import { IConfig, IConfigsResponse, ISplitChangesResponse, ISplitCondition } from '../../../dtos/types';
import { IFetchSplitChanges, IResponse } from '../../../services/types';
import { ISplitChangesFetcher } from './types';

/**
 * Factory of Configs fetcher.
 * Configs fetcher is a wrapper around `configs` API service that parses the response and handle errors.
 */
export function configsFetcherFactory(fetchConfigs: IFetchSplitChanges): ISplitChangesFetcher {

  return function configsFetcher(
    since: number,
    noCache?: boolean,
    till?: number,
    rbSince?: number,
    // Optional decorator for `fetchSplitChanges` promise, such as timeout or time tracker
    decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
  ): Promise<ISplitChangesResponse> {

    let configsPromise = fetchConfigs(since, noCache, till, rbSince);
    if (decorator) configsPromise = decorator(configsPromise);

    return configsPromise
      .then((resp: IResponse) => resp.json())
      .then(convertConfigsResponseToSplitChangesResponse);
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

function convertConfigToDefinitionDTO(config: IConfig) {
  const defaultTreatment = config.defaultTreatment || 'default';

  return {
    ...config,
    defaultTreatment,
    trafficTypeName: config.trafficTypeName || 'user',
    conditions: config.conditions && config.conditions.length > 0 ? config.conditions : [defaultCondition(defaultTreatment)],
    killed: config.killed || false,
    seed: config.seed || 0,
    trafficAllocation: config.trafficAllocation || 100,
    trafficAllocationSeed: config.trafficAllocationSeed || 0,
  };
}

function convertConfigsResponseToSplitChangesResponse(configs: IConfigsResponse): ISplitChangesResponse {
  return {
    ...configs,
    ff: configs.configs ? {
      ...configs.configs,
      d: configs.configs.d?.map(convertConfigToDefinitionDTO)
    } : undefined,
    rbs: configs.rbs
  };
}
