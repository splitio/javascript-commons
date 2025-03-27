import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { evaluateFeature } from '../../index';
import { IMatcher, IMatcherDto } from '../../types';
import { IStorageSync } from '../../../storages/types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { ISplit } from '../../../dtos/types';
import { ALWAYS_ON_SPLIT, ALWAYS_OFF_SPLIT } from '../../../storages/__tests__/testUtils';

const STORED_SPLITS: Record<string, ISplit> = {
  'always-on': ALWAYS_ON_SPLIT,
  'always-off': ALWAYS_OFF_SPLIT
};

const mockStorage = {
  splits: {
    getSplit: (name: string) => STORED_SPLITS[name]
  }
};

test('MATCHER IN_SPLIT_TREATMENT / should return true ONLY when parent split returns one of the expected treatments', () => {
  const matcherTrueAlwaysOn = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-on',
      treatments: ['not-existing', 'on', 'other'] // We should match from a list of treatments
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  const matcherFalseAlwaysOn = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-on',
      treatments: ['off', 'v1']
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  const matcherTrueAlwaysOff = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-off',
      treatments: ['not-existing', 'off']
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  const matcherFalseAlwaysOff = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-off',
      treatments: ['v1', 'on']
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  expect(matcherTrueAlwaysOn({ key: 'a-key' }, evaluateFeature)).toBe(true); // Parent split returns one of the expected treatments, so the matcher returns true
  expect(matcherFalseAlwaysOn({ key: 'a-key' }, evaluateFeature)).toBe(false); // Parent split returns treatment "on", but we are expecting ["off", "v1"], so the matcher returns false
  expect(matcherTrueAlwaysOff({ key: 'a-key' }, evaluateFeature)).toBe(true); // Parent split returns one of the expected treatments, so the matcher returns true
  expect(matcherFalseAlwaysOff({ key: 'a-key' }, evaluateFeature)).toBe(false); // Parent split returns treatment "on", but we are expecting ["off", "v1"], so the matcher returns false
});

test('MATCHER IN_SPLIT_TREATMENT / Edge cases', () => {
  const matcherParentNotExist = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'not-existent-split',
      treatments: ['on', 'off']
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  // @ts-ignore
  const matcherNoTreatmentsExpected = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-on',
      treatments: []
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  // @ts-ignore
  const matcherParentNameEmpty = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: '',
      treatments: []
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  // @ts-ignore
  const matcherParentNameWrongType = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: { some: 44 },
      treatments: []
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  const matcherExpectedTreatmentWrongTypeMatching = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-on',
      treatments: [null, [1, 2], 3, {}, true, 'on']
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  const matcherExpectedTreatmentWrongTypeNotMatching = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-off',
      treatments: [null, [1, 2], 3, {}, true, 'on']
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  // @ts-ignore
  const matcherExpectationsListWrongType = matcherFactory(loggerMock, {
    type: matcherTypes.IN_SPLIT_TREATMENT,
    value: {
      split: 'always-on',
      treatments: 658
    }
  } as IMatcherDto, mockStorage as IStorageSync) as IMatcher;

  expect(matcherParentNotExist({ key: 'a-key' }, evaluateFeature)).toBe(false); // If the parent split does not exist, matcher should return false
  expect(matcherNoTreatmentsExpected({ key: 'a-key' }, evaluateFeature)).toBe(false); // If treatments expectation list is empty, matcher should return false (no treatment will match)
  expect(matcherParentNameEmpty({ key: 'a-key' }, evaluateFeature)).toBe(false); // If the parent split name is empty, matcher should return false
  expect(matcherParentNameWrongType({ key: 'a-key' }, evaluateFeature)).toBe(false); // If the parent split name is not a string, matcher should return false
  expect(matcherExpectedTreatmentWrongTypeMatching({ key: 'a-key' }, evaluateFeature)).toBe(true); // If treatments expectation list has elements of the wrong type, those elements are overlooked.
  expect(matcherExpectedTreatmentWrongTypeNotMatching({ key: 'a-key' }, evaluateFeature)).toBe(false); // If treatments expectation list has elements of the wrong type, those elements are overlooked.
  expect(matcherExpectationsListWrongType({ key: 'a-key' }, evaluateFeature)).toBe(false); // If treatments expectation list has wrong type, matcher should return false
});
