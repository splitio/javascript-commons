import { objectAssign } from '../utils/lang/objectAssign';
import { IClientSS, IClientWithKey, ILogger, SplitKey } from '../types';
import { clientAttributesDecoration } from './clientAttributesDecoration';


/**
 * Decorator that binds a key and (optionally) a traffic type to client methods
 *
 * @param client sync client instance
 * @param key validated split key
 * @param trafficType validated traffic type
 */
export function clientCSDecorator(log: ILogger, client: IClientSS, key: SplitKey, trafficType?: string) {

  let clientCS = clientAttributesDecoration(log, client);

  return objectAssign(clientCS, {
    // In the client-side API, we bind a key to the client `getTreatment*` methods
    getTreatment: clientCS.getTreatment.bind(clientCS, key),
    getTreatmentWithConfig: clientCS.getTreatmentWithConfig.bind(clientCS, key),
    getTreatments: clientCS.getTreatments.bind(clientCS, key),
    getTreatmentsWithConfig: clientCS.getTreatmentsWithConfig.bind(clientCS, key),

    // Key is bound to the `track` method. Same thing happens with trafficType but only if provided
    track: trafficType ? clientCS.track.bind(clientCS, key, trafficType) : clientCS.track.bind(clientCS, key),

    isClientSide: true
  }) as IClientWithKey;
}
