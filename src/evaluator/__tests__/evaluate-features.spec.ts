import { evaluateFeatures, evaluateFeaturesByFlagSets } from '../index';
import { EXCEPTION, NOT_IN_SPLIT, SPLIT_ARCHIVED, SPLIT_KILLED, DEFINITION_NOT_FOUND } from '../../utils/labels';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { WARN_FLAGSET_WITHOUT_FLAGS } from '../../logger/constants';
import { IDefinition } from '../../dtos/types';
import { IStorageSync } from '../../storages/types';

const splitsMock: Record<string, IDefinition> = {
  regular: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on', 'seed': 1684183541, 'configurations': {}, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  config: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on', 'seed': 1684183541, 'configurations': { 'on': "{color:'black'}" }, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  killed: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on2', 'seed': 1684183541, 'configurations': {}, 'status': 'ACTIVE', 'killed': true, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  archived: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on3', 'seed': 1684183541, 'configurations': {}, 'status': 'ARCHIVED', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  trafficAlocation1: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': -1667452163, 'trafficAllocation': 1, 'trafficTypeName': 'user', 'name': 'always-on4', 'seed': 1684183541, 'configurations': {}, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  killedWithConfig: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on5', 'seed': 1684183541, 'configurations': { 'off': "{color:'black'}" }, 'status': 'ACTIVE', 'killed': true, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  archivedWithConfig: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on5', 'seed': 1684183541, 'configurations': { 'off': "{color:'black'}" }, 'status': 'ARCHIVED', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  trafficAlocation1WithConfig: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': -1667452163, 'trafficAllocation': 1, 'trafficTypeName': 'user', 'name': 'always-on6', 'seed': 1684183541, 'configurations': { 'off': "{color:'black'}" }, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': null, 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': null, 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] }
};

const flagSetsMock: Record<string, Set<string>> = {
  reg_and_config: new Set(['regular', 'config']),
  arch_and_killed: new Set(['killed', 'archived']),
};

const mockStorage = {
  definitions: {
    get(name: string) {
      if (name === 'throw_exception') throw new Error('Error');
      if (splitsMock[name]) return splitsMock[name];

      return null;
    },
    getMany(names: string[]) {
      return names.reduce((acc, name) => {
        acc[name] = this.get(name);
        return acc;
      }, {} as Record<string, IDefinition | null>);
    },
    getNamesBySets(flagSets: string[]) {
      return flagSets.map(flagset => flagSetsMock[flagset] || new Set());
    }
  }
} as IStorageSync;

test('EVALUATOR - Multiple evaluations at once  / should return label exception, treatment control and config null on error', async () => {
  const expectedOutput = {
    throw_exception: {
      treatment: 'control',
      label: EXCEPTION,
      config: null
    }
  };

  // This validation is async because the only exception possible when retrieving a Split would happen with Async storages.
  const evaluation = await evaluateFeatures(
    loggerMock,
    'fake-key',
    ['throw_exception'],
    undefined,
    mockStorage,
  );

  expect(evaluation).toEqual(expectedOutput); // If there was an error on the get method, we should get the results for exception.

});


test('EVALUATOR - Multiple evaluations at once / should return right labels, treatments and definitions if storage returns without errors.', async () => {
  const expectedOutput = {
    config: {
      treatment: 'on', label: 'in segment all', definition: splitsMock['config']
    },
    not_existent_split: {
      treatment: 'control', label: DEFINITION_NOT_FOUND, config: null
    },
  };

  const multipleEvaluationAtOnce = await evaluateFeatures(
    loggerMock,
    'fake-key',
    ['config', 'not_existent_split', 'regular', 'killed', 'archived', 'trafficAlocation1', 'killedWithConfig', 'archivedWithConfig', 'trafficAlocation1WithConfig'],
    undefined,
    mockStorage,
  );
  // assert evaluationWithConfig
  expect(multipleEvaluationAtOnce['config']).toEqual(expectedOutput['config']); // If the split is retrieved successfully we should get the right evaluation result, label and definition.
  // assert evaluationNotFound
  expect(multipleEvaluationAtOnce['not_existent_split']).toEqual(expectedOutput['not_existent_split']); // If the split is not retrieved successfully because it does not exist, we should get the right evaluation result, label and config.
  // assert regular
  expect(multipleEvaluationAtOnce['regular']).toEqual({ ...expectedOutput['config'], definition: splitsMock['regular'] }); // If the split is retrieved successfully we should get the right evaluation result, label and definition.
  // assert killed
  expect(multipleEvaluationAtOnce['killed']).toEqual({ ...expectedOutput['config'], treatment: 'off', label: SPLIT_KILLED, definition: splitsMock['killed'] });
  // 'If the split is retrieved but is killed, we should get the right evaluation result, label and definition.

  // assert archived
  expect(multipleEvaluationAtOnce['archived']).toEqual({ ...expectedOutput['config'], treatment: 'control', label: SPLIT_ARCHIVED, definition: splitsMock['archived'] });
  // If the split is retrieved but is archived, we should get the right evaluation result, label and definition.

  // assert trafficAllocation1
  expect(multipleEvaluationAtOnce['trafficAlocation1']).toEqual({ ...expectedOutput['config'], label: NOT_IN_SPLIT, treatment: 'off', definition: splitsMock['trafficAlocation1'] });
  // If the split is retrieved but is not in split (out of Traffic Allocation), we should get the right evaluation result, label and definition.

  // assert killedWithConfig
  expect(multipleEvaluationAtOnce['killedWithConfig']).toEqual({ ...expectedOutput['config'], treatment: 'off', label: SPLIT_KILLED, definition: splitsMock['killedWithConfig'] });
  // If the split is retrieved but is killed, we should get the right evaluation result, label and definition.

  // assert archivedWithConfig
  expect(multipleEvaluationAtOnce['archivedWithConfig']).toEqual({ ...expectedOutput['config'], treatment: 'control', label: SPLIT_ARCHIVED, definition: splitsMock['archivedWithConfig'] });
  // If the split is retrieved but is archived, we should get the right evaluation result, label and definition.

  // assert trafficAlocation1WithConfig
  expect(multipleEvaluationAtOnce['trafficAlocation1WithConfig']).toEqual({ ...expectedOutput['config'], label: NOT_IN_SPLIT, treatment: 'off', definition: splitsMock['trafficAlocation1WithConfig'] });
  // If the split is retrieved but is not in split (out of Traffic Allocation), we should get the right evaluation result, label and definition.

});

describe('EVALUATOR - Multiple evaluations at once by flag sets', () => {

  const expectedOutput = {
    config: {
      treatment: 'on', label: 'in segment all', definition: splitsMock['config']
    },
    not_existent_split: {
      treatment: 'control', label: DEFINITION_NOT_FOUND, config: null
    },
  };

  const getResultsByFlagSets = (flagSets: string[], storage = mockStorage) => {
    return evaluateFeaturesByFlagSets(
      loggerMock,
      'fake-key',
      flagSets,
      undefined,
      storage,
      'method-name'
    );
  };

  test('should return right labels, treatments and configs if storage returns without errors', async () => {

    let multipleEvaluationAtOnceByFlagSets = await getResultsByFlagSets(['reg_and_config', 'arch_and_killed']);

    // assert evaluationWithConfig
    expect(multipleEvaluationAtOnceByFlagSets['config']).toEqual(expectedOutput['config']); // If the split is retrieved successfully we should get the right evaluation result, label and config.
    // @todo assert flag set not found - for input validations

    // assert regular
    expect(multipleEvaluationAtOnceByFlagSets['regular']).toEqual({ ...expectedOutput['config'], definition: splitsMock['regular'] }); // If the split is retrieved successfully we should get the right evaluation result, label and definition.
    // assert killed
    expect(multipleEvaluationAtOnceByFlagSets['killed']).toEqual({ ...expectedOutput['config'], treatment: 'off', label: SPLIT_KILLED, definition: splitsMock['killed'] });
    // 'If the split is retrieved but is killed, we should get the right evaluation result, label and definition.

    // assert archived
    expect(multipleEvaluationAtOnceByFlagSets['archived']).toEqual({ ...expectedOutput['config'], treatment: 'control', label: SPLIT_ARCHIVED, definition: splitsMock['archived'] });
    // If the split is retrieved but is archived, we should get the right evaluation result, label and definition.

    // assert not_existent_split not in evaluation if it is not related to defined flag sets
    expect(multipleEvaluationAtOnceByFlagSets['not_existent_split']).toEqual(undefined);

    multipleEvaluationAtOnceByFlagSets = await getResultsByFlagSets([]);
    expect(multipleEvaluationAtOnceByFlagSets).toEqual({});

    multipleEvaluationAtOnceByFlagSets = await getResultsByFlagSets(['reg_and_config']);
    expect(multipleEvaluationAtOnceByFlagSets['config']).toEqual(expectedOutput['config']);
    expect(multipleEvaluationAtOnceByFlagSets['regular']).toEqual({ ...expectedOutput['config'], definition: splitsMock['regular'] });
    expect(multipleEvaluationAtOnceByFlagSets['killed']).toEqual(undefined);
    expect(multipleEvaluationAtOnceByFlagSets['archived']).toEqual(undefined);
  });

  test('should log a warning if evaluating with flag sets that doesn\'t contain cached feature flags', async () => {
    const getManySpy = jest.spyOn(mockStorage.definitions, 'getMany');

    // No flag set contains cached feature flags -> getMany method is not called
    expect(getResultsByFlagSets(['inexistent_set1', 'inexistent_set2'])).toEqual({});
    expect(getManySpy).not.toHaveBeenCalled();
    expect(loggerMock.warn.mock.calls).toEqual([
      [WARN_FLAGSET_WITHOUT_FLAGS, ['method-name', 'inexistent_set1']],
      [WARN_FLAGSET_WITHOUT_FLAGS, ['method-name', 'inexistent_set2']],
    ]);

    // One flag set contains cached feature flags -> getMany method is called
    expect(getResultsByFlagSets(['inexistent_set3', 'reg_and_config'])).toEqual(getResultsByFlagSets(['reg_and_config']));
    expect(getManySpy).toHaveBeenLastCalledWith(['regular', 'config']);
    expect(loggerMock.warn).toHaveBeenLastCalledWith(WARN_FLAGSET_WITHOUT_FLAGS, ['method-name', 'inexistent_set3']);

    getManySpy.mockRestore();
    loggerMock.warn.mockClear();

    // Should support async storage too
    expect(await getResultsByFlagSets(['inexistent_set1', 'inexistent_set2'], {
      definitions: {
        getNamesBySets(flagSets: string[]) { return Promise.resolve(flagSets.map(flagset => flagSetsMock[flagset] || new Set())); }
      }
    } as unknown as IStorageSync)).toEqual({});
    expect(loggerMock.warn.mock.calls).toEqual([
      [WARN_FLAGSET_WITHOUT_FLAGS, ['method-name', 'inexistent_set1']],
      [WARN_FLAGSET_WITHOUT_FLAGS, ['method-name', 'inexistent_set2']],
    ]);
  });
});
