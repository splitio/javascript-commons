import { IConfig, IConfigsResponse, ISplitChangesResponse } from '../../../dtos/types';
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
      .then((configs: IConfigsResponse) => {
        return convertConfigsToSplits(configs);
      });
  };

}

function convertConfigsToSplits(configs: IConfigsResponse): ISplitChangesResponse {
  return {
    ...configs,
    ff: configs.configs ? {
      ...configs.configs,
      d: configs.configs.d?.map((config: IConfig) => {
        // @TODO: review defaults
        return {
          ...config,
          defaultTreatment: config.defaultTreatment,
          conditions: config.conditions || [],
          killed: config.killed || false,
          trafficTypeName: config.trafficTypeName || 'user',
          seed: config.seed || 0,
          trafficAllocation: config.trafficAllocation || 0,
          trafficAllocationSeed: config.trafficAllocationSeed || 0,
        };
      })
    } : undefined,
    rbs: configs.rbs
  };
}
