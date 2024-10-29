import { objectAssign } from '../utils/lang/objectAssign';
import { ILogger } from '../logger/types';
import SplitIO from '../../types/splitio';
import { clientAttributesDecoration } from './clientAttributesDecoration';


/**
 * Decorator that binds a key to client methods
 *
 * @param client sync client instance
 * @param key validated split key
 */
export function clientCSDecorator(log: ILogger, client: SplitIO.INodeClient, key: SplitIO.SplitKey): SplitIO.IClient {

  let clientCS = clientAttributesDecoration(log, client);

  return objectAssign(clientCS, {
    // In the client-side API, we bind a key to the client `getTreatment*` and `track` methods
    getTreatment: clientCS.getTreatment.bind(clientCS, key),
    getTreatmentWithConfig: clientCS.getTreatmentWithConfig.bind(clientCS, key),
    getTreatments: clientCS.getTreatments.bind(clientCS, key),
    getTreatmentsWithConfig: clientCS.getTreatmentsWithConfig.bind(clientCS, key),
    getTreatmentsByFlagSets: clientCS.getTreatmentsByFlagSets.bind(clientCS, key),
    getTreatmentsWithConfigByFlagSets: clientCS.getTreatmentsWithConfigByFlagSets.bind(clientCS, key),
    getTreatmentsByFlagSet: clientCS.getTreatmentsByFlagSet.bind(clientCS, key),
    getTreatmentsWithConfigByFlagSet: clientCS.getTreatmentsWithConfigByFlagSet.bind(clientCS, key),

    track: clientCS.track.bind(clientCS, key),

    // Not part of the public API. These properties are used to support other modules (e.g., Split Suite)
    isClientSide: true,
    key
  }) as SplitIO.IClient;
}
