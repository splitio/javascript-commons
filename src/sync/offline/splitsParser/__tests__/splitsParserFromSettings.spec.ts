import SplitIO from '../../../../../types/splitio';
import { IDefinition } from '../../../../dtos/types';
import { splitsParserFromSettingsFactory } from '../splitsParserFromSettings';

const FEATURE_ON = { conditions: [{ conditionType: 'ROLLOUT', label: 'default rule', matcherGroup: { combiner: 'AND', matchers: [{ keySelector: null, matcherType: 'ALL_KEYS', negate: false }] }, partitions: [{ size: 100, treatment: 'on' }] }], configurations: {}, trafficTypeName: 'localhost', status: 'ACTIVE', killed: false, trafficAllocation: 100, defaultTreatment: 'control' };
const FEATURE_OFF = { conditions: [{ conditionType: 'ROLLOUT', label: 'default rule', matcherGroup: { combiner: 'AND', matchers: [{ keySelector: null, matcherType: 'ALL_KEYS', negate: false }] }, partitions: [{ size: 100, treatment: 'off' }] }], configurations: {}, trafficTypeName: 'localhost', status: 'ACTIVE', killed: false, trafficAllocation: 100, defaultTreatment: 'control' };

// Expected definition, which has no `changeNumber`
function definition(name: string, base: object) {
  return { name, ...base } as unknown as IDefinition;
}

test('splitsParserFromSettingsFactory', () => {

  const instance = splitsParserFromSettingsFactory();
  let lastTill = 0;

  // Asserts the response and returns the `till`, which must be incrementing
  function expectChanges(settings: Pick<SplitIO.ISettings, 'features'>, updated: [string, object][], removed: string[]) {
    const changes = instance(settings);
    const till = changes.d!.till!;
    expect(till).toBeGreaterThan(lastTill);
    lastTill = till;
    expect(changes).toEqual({ d: { updated: updated.map(([name, base]) => definition(name, base)), removed, till } });
  }

  const settings = { features: {} as SplitIO.MockedFeaturesMap };

  // First call reports the (empty) mock
  expectChanges(settings, [], []);

  // Pass the same settings
  expect(instance(settings)).toEqual({});

  // New features object with new content
  settings.features = { feature1: 'on' };
  expectChanges(settings, [['feature1', FEATURE_ON]], []);

  // New features object but same content
  settings.features = { feature1: 'on' };
  expect(instance(settings)).toEqual({});

  // Update property
  settings.features['feature1'] = 'off';
  expectChanges(settings, [['feature1', FEATURE_OFF]], []);

  // New settings object but same content
  expect(instance({ features: { feature1: 'off' } })).toEqual({});

  // Same content but in a different format
  settings.features['feature1'] = { treatment: 'off', config: null };
  expect(instance(settings)).toEqual({});

  // Add new feature flag property: only the new flag is reported as updated
  settings.features['feature2'] = { treatment: 'on', config: null };
  expectChanges(settings, [['feature2', FEATURE_ON]], []);

  // New settings object but same content
  expect(instance({ features: { feature1: { treatment: 'off', config: null }, feature2: { treatment: 'on', config: null } } })).toEqual({});

  // Update property
  settings.features['feature2'].config = 'some_config';
  expectChanges(settings, [['feature2', { ...FEATURE_ON, configurations: { on: 'some_config' } }]], []);

  // Remove a feature flag property
  settings.features = { feature2: { treatment: 'on', config: 'some_config' } };
  expectChanges(settings, [], ['feature1']);

  // @ts-expect-error No object implies no features
  settings.features = undefined;
  expectChanges(settings, [], ['feature2']);
});
