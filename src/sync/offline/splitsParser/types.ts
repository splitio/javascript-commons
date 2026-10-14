import { IDefinition, IDefinitionChangesResponse } from '../../../dtos/types';
import { ISettings } from '../../../types';

// Split definition used in offline mode
export type IDefinitionPartial = Pick<IDefinition, 'conditions' | 'configurations' | 'trafficTypeName'>

/**
 * Analog to `IDefinitionChangesFetcher` used by `definitionChangesUpdaterFactory`.
 * It returns the definitions changes since the last call, with an incrementing `till`.
 * The response has no `d` property if there are no changes, e.g., if the mocked definitions were not modified since the last call.
 */
export type IDefinitionsParser = (settings: ISettings) => IDefinitionChangesResponse
