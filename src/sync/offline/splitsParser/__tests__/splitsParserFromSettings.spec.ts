import SplitIO from '../../../../../types/splitio';
import { splitsParserFromSettingsFactory } from '../splitsParserFromSettings';

const FEATURE_ON = { conditions: [{ conditionType: 'ROLLOUT', label: 'default rule', matcherGroup: { combiner: 'AND', matchers: [{ keySelector: null, matcherType: 'ALL_KEYS', negate: false }] }, partitions: [{ size: 100, treatment: 'on' }] }], configurations: {}, trafficTypeName: 'localhost' };
const FEATURE_OFF = { conditions: [{ conditionType: 'ROLLOUT', label: 'default rule', matcherGroup: { combiner: 'AND', matchers: [{ keySelector: null, matcherType: 'ALL_KEYS', negate: false }] }, partitions: [{ size: 100, treatment: 'off' }] }], configurations: {}, trafficTypeName: 'localhost' };

test('splitsParserFromSettingsFactory', () => {

  const instance = splitsParserFromSettingsFactory();

  const settings = { features: {} as SplitIO.MockedFeaturesMap };
  expect(instance(settings)).toEqual({});

  // Pass the same settings
  expect(instance(settings)).toEqual(false);

  // New features object with new content
  settings.features = { feature1: 'on' };
  expect(instance(settings)).toEqual({ feature1: FEATURE_ON });

  // New features object but same content
  settings.features = { feature1: 'on' };
  expect(instance(settings)).toEqual(false);

  // Update property
  settings.features['feature1'] = 'off';
  expect(instance(settings)).toEqual({ feature1: FEATURE_OFF });

  // New settings object but same content
  expect(instance({ features: { feature1: 'off' } })).toEqual(false);

  // Update property. Same content but in a different format
  settings.features['feature1'] = { treatment: 'off', config: null };
  expect(instance(settings)).toEqual({ feature1: FEATURE_OFF });

  // Add new feature flag property
  settings.features['feature2'] = { treatment: 'on', config: null };
  expect(instance(settings)).toEqual({ feature1: FEATURE_OFF, feature2: FEATURE_ON });

  // New settings object but same content
  expect(instance({ features: { feature1: { treatment: 'off', config: null }, feature2: { treatment: 'on', config: null } } })).toEqual(false);

  // Update property
  settings.features['feature2'].config = 'some_config';
  expect(instance(settings)).toEqual({ feature1: FEATURE_OFF, feature2: { ...FEATURE_ON, configurations: { on: 'some_config' } } });

  // @ts-expect-error No object implies no features
  settings.features = undefined;
  expect(instance(settings)).toEqual({});
});
