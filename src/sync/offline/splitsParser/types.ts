import { IDefinition } from '../../../dtos/types';
import { ISettings } from '../../../types';

// Split definition used in offline mode
export type IDefinitionPartial = Pick<IDefinition, 'conditions' | 'configurations' | 'trafficTypeName'>

// Analog to `IDefinitionChangesFetcher` used by `definitionChangesUpdaterFactory`
export type IDefinitionsParser = (settings: ISettings) => false | Record<string, IDefinitionPartial>
