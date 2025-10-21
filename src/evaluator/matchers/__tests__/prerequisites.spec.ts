import { evaluateFeature } from '../../index';
import { IStorageSync } from '../../../storages/types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { ISplit } from '../../../dtos/types';
import { ALWAYS_ON_SPLIT, ALWAYS_OFF_SPLIT } from '../../../storages/__tests__/testUtils';
import { prerequisitesMatcherContext } from '../prerequisites';
import { FallbackTreatmentsCalculator } from '../../fallbackTreatmentsCalculator';

const STORED_SPLITS: Record<string, ISplit> = {
  'always-on': ALWAYS_ON_SPLIT,
  'always-off': ALWAYS_OFF_SPLIT
};

const mockStorage = {
  splits: {
    getSplit: (name: string) => STORED_SPLITS[name]
  }
} as IStorageSync;

const fallbackTreatmentsCalculator = new FallbackTreatmentsCalculator(loggerMock);

test('MATCHER PREREQUISITES / should return true when all prerequisites are met', () => {
  // A single prerequisite
  const matcherTrueAlwaysOn = prerequisitesMatcherContext([{
    n: 'always-on',
    ts: ['not-existing', 'on', 'other'] // We should match from a list of treatments
  }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherTrueAlwaysOn({ key: 'a-key' }, evaluateFeature)).toBe(true); // Feature flag returns one of the expected treatments, so the matcher returns true

  const matcherFalseAlwaysOn = prerequisitesMatcherContext([{
    n: 'always-on',
    ts: ['off', 'v1']
  }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherFalseAlwaysOn({ key: 'a-key' }, evaluateFeature)).toBe(false); // Feature flag returns treatment "on", but we are expecting ["off", "v1"], so the matcher returns false

  const matcherTrueAlwaysOff = prerequisitesMatcherContext([{
    n: 'always-off',
    ts: ['not-existing', 'off']
  }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherTrueAlwaysOff({ key: 'a-key' }, evaluateFeature)).toBe(true); // Feature flag returns one of the expected treatments, so the matcher returns true

  const matcherFalseAlwaysOff = prerequisitesMatcherContext([{
    n: 'always-off',
    ts: ['v1', 'on']
  }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherFalseAlwaysOff({ key: 'a-key' }, evaluateFeature)).toBe(false); // Feature flag returns treatment "on", but we are expecting ["off", "v1"], so the matcher returns false

  // Multiple prerequisites
  const matcherTrueMultiplePrerequisites = prerequisitesMatcherContext([
    {
      n: 'always-on',
      ts: ['on']
    },
    {
      n: 'always-off',
      ts: ['off']
    }
  ], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherTrueMultiplePrerequisites({ key: 'a-key' }, evaluateFeature)).toBe(true); // All prerequisites are met, so the matcher returns true

  const matcherFalseMultiplePrerequisites = prerequisitesMatcherContext([
    {
      n: 'always-on',
      ts: ['on']
    },
    {
      n: 'always-off',
      ts: ['on']
    }
  ], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherFalseMultiplePrerequisites({ key: 'a-key' }, evaluateFeature)).toBe(false); // One of the prerequisites is not met, so the matcher returns false
});

test('MATCHER PREREQUISITES / Edge cases', () => {
  // No prerequisites
  const matcherTrueNoPrerequisites = prerequisitesMatcherContext(undefined, mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherTrueNoPrerequisites({ key: 'a-key' }, evaluateFeature)).toBe(true);

  const matcherTrueEmptyPrerequisites = prerequisitesMatcherContext([], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherTrueEmptyPrerequisites({ key: 'a-key' }, evaluateFeature)).toBe(true);

  // Non existent feature flag
  const matcherParentNotExist = prerequisitesMatcherContext([{
    n: 'not-existent-feature-flag',
    ts: ['on', 'off']
  }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherParentNotExist({ key: 'a-key' }, evaluateFeature)).toBe(false); // If the feature flag does not exist, matcher should return false

  // Empty treatments list
  const matcherNoTreatmentsExpected = prerequisitesMatcherContext([
    {
      n: 'always-on',
      ts: []
    }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherNoTreatmentsExpected({ key: 'a-key' }, evaluateFeature)).toBe(false); // If treatments expectation list is empty, matcher should return false (no treatment will match)

  const matcherExpectedTreatmentWrongTypeMatching = prerequisitesMatcherContext([{
    n: 'always-on', // @ts-ignore
    ts: [null, [1, 2], 3, {}, true, 'on']

  }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherExpectedTreatmentWrongTypeMatching({ key: 'a-key' }, evaluateFeature)).toBe(true); // If treatments expectation list has elements of the wrong type, those elements are overlooked.

  const matcherExpectedTreatmentWrongTypeNotMatching = prerequisitesMatcherContext([{
    n: 'always-off', // @ts-ignore
    ts: [null, [1, 2], 3, {}, true, 'on']
  }], mockStorage, loggerMock, fallbackTreatmentsCalculator);
  expect(matcherExpectedTreatmentWrongTypeNotMatching({ key: 'a-key' }, evaluateFeature)).toBe(false); // If treatments expectation list has elements of the wrong type, those elements are overlooked.
});
