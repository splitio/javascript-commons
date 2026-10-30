import { IDefinition, IDefinitionChangesResponse } from '../../../dtos/types';
import { CONTROL } from '../../../utils/constants';
import { IDefinitionPartial } from './types';

/**
 * Factory of a stateful function that, given the current mocked definitions, returns the changes since the previous call
 * as an `IDefinitionChangesResponse`, i.e., the full definitions that were added or modified, and the names of the removed ones.
 * Definitions are compared by value. The response `till` is an incrementing value based on the current time.
 * Definitions have no `changeNumber`, so storages never consider them outdated.
 *
 * The response has no `d` property if there are no changes, except for the first call, which reports the (possibly empty) mock.
 * It is meant to be used by `IDefinitionsParser` implementations, such as `splitsParserFromSettings`.
 */
export function definitionChangesBuilderFactory() {

  let previous: Record<string, string> | undefined; // serialized definitions of the last reported mock, by name
  let lastTill = 0;

  return function definitionChangesBuilder(mock: Record<string, IDefinitionPartial>): IDefinitionChangesResponse {
    const current: Record<string, string> = {};
    const updatedNames = Object.keys(mock).reduce((updatedNames: string[], name) => {
      current[name] = JSON.stringify(mock[name]);
      if (!previous || previous[name] !== current[name]) updatedNames.push(name);
      return updatedNames;
    }, []);

    const removed = previous ? Object.keys(previous).filter(name => current[name] === undefined) : [];

    // Only the first call reports an empty change
    if (previous && updatedNames.length === 0 && removed.length === 0) return {};

    previous = current;

    // Incrementing `till` based on the current time
    const till = lastTill = Math.max(Date.now(), lastTill + 1);

    const updated = updatedNames.map(name => ({
      name,
      status: 'ACTIVE',
      killed: false,
      trafficAllocation: 100,
      defaultTreatment: CONTROL, // `seed` is undefined in localhost mode
      ...mock[name]
    } as IDefinition));

    return { d: { updated, removed, till } };
  };

}
