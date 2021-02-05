import { ISplitPartial } from '../../../dtos/types';
import { ISettings } from '../../../types';

// Analog to `ISplitChangesFetcher` used by `splitChangesUpdaterFactory`
export type ISplitsParser = (settings: ISettings) => false | Record<string, ISplitPartial>
