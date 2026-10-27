import { DefinitionsCacheInMemory } from '../../../../storages/inMemory/DefinitionsCacheInMemory';
import { SDK_DEFINITIONS_ARRIVED, FLAGS_UPDATE } from '../../../../readiness/constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { fromObjectUpdaterFactory } from '../fromObjectSyncTask';
import { IDefinition, IDefinitionChangesResponse } from '../../../../dtos/types';

const definition = (name: string, treatment: string, changeNumber: number) => ({ name, changeNumber, conditions: [{ matcherGroup: { combiner: 'AND', matchers: [{ matcherType: 'ALL_KEYS', negate: false }] }, partitions: [{ treatment, size: 100 }] }], trafficTypeName: 'user' } as unknown as IDefinition);

test('fromObjectUpdater / SDK_DEFINITIONS_ARRIVED carries the names of the definitions updated in storage', async () => {
  let changes: IDefinitionChangesResponse = {};
  const definitions = new DefinitionsCacheInMemory();
  const emit = jest.fn();
  const readiness = { definitions: { emit }, segments: { emit: jest.fn() } };

  // @ts-ignore
  const updater = fromObjectUpdaterFactory(() => changes, { definitions }, readiness, { log: loggerMock });
  const lastMetadata = () => emit.mock.calls[emit.mock.calls.length - 1];

  // definition in storage from a previous session is cleared on start
  definitions.update([definition('old', 'on', 1000)], [], 1000);

  // initial load
  changes = { d: { updated: [definition('a', 'on', 10), definition('b', 'on', 10)], removed: [], till: 10 } };
  await updater();
  expect(lastMetadata()).toEqual([SDK_DEFINITIONS_ARRIVED, { type: FLAGS_UPDATE, names: ['a', 'b'] }]);
  expect(definitions.getNames()).toEqual(['a', 'b']);
  expect(definitions.getChangeNumber()).toBe(10);

  // no changes: nothing is updated nor emitted
  emit.mockClear();
  changes = {};
  await updater();
  expect(emit).toBeCalledTimes(0);

  // 'a' modified, 'b' removed, 'c' added
  changes = { d: { updated: [definition('a', 'off', 11), definition('c', 'on', 11)], removed: ['b'], till: 11 } };
  await updater();
  expect(lastMetadata()).toEqual([SDK_DEFINITIONS_ARRIVED, { type: FLAGS_UPDATE, names: ['b', 'a', 'c'] }]);
  expect(definitions.getNames()).toEqual(['a', 'c']);
  expect(definitions.getChangeNumber()).toBe(11);
});
