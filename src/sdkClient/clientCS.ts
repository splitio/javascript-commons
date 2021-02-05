import objectAssign from 'object-assign';
import { SplitIO } from '../types';


/**
 * Decorator that binds a key and (optionally) a traffic type to client methods
 *
 * @param client sync client instance
 * @param key validated split key
 * @param trafficType validated traffic type
 */
export default function clientCSDecorator(client: SplitIO.IClient, key: SplitIO.SplitKey, trafficType?: string): SplitIO.ICsClient {
  return objectAssign(client, {
    // In the client-side API, we bind a key to the client `getTreatment*` methods
    getTreatment: client.getTreatment.bind(client, key),
    getTreatmentWithConfig: client.getTreatmentWithConfig.bind(client, key),
    getTreatments: client.getTreatments.bind(client, key),
    getTreatmentsWithConfig: client.getTreatmentsWithConfig.bind(client, key),

    // Key is bound to the `track` method. Same thing happens with trafficType but only if provided
    track: trafficType ? client.track.bind(client, key, trafficType) : client.track.bind(client, key)
  }) as SplitIO.ICsClient;
}
