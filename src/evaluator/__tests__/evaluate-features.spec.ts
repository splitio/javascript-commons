// @ts-nocheck
import { evaluateFeatures, evaluateFeaturesByFlagSets } from '../index';
import * as LabelsConstants from '../../utils/labels';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { _Set } from '../../utils/lang/sets';
import { returnSetsUnion } from '../../utils/lang/sets';

const splitsMock = {
  regular: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on', 'seed': 1684183541, 'configurations': {}, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  config: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on', 'seed': 1684183541, 'configurations': { 'on': "{color:'black'}" }, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  killed: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on2', 'seed': 1684183541, 'configurations': {}, 'status': 'ACTIVE', 'killed': true, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  archived: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on3', 'seed': 1684183541, 'configurations': {}, 'status': 'ARCHIVED', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  trafficAlocation1: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': -1667452163, 'trafficAllocation': 1, 'trafficTypeName': 'user', 'name': 'always-on4', 'seed': 1684183541, 'configurations': {}, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  killedWithConfig: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on5', 'seed': 1684183541, 'configurations': { 'off': "{color:'black'}" }, 'status': 'ACTIVE', 'killed': true, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  archivedWithConfig: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': 1667452163, 'trafficAllocation': 100, 'trafficTypeName': 'user', 'name': 'always-on5', 'seed': 1684183541, 'configurations': { 'off': "{color:'black'}" }, 'status': 'ARCHIVED', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] },
  trafficAlocation1WithConfig: { 'changeNumber': 1487277320548, 'trafficAllocationSeed': -1667452163, 'trafficAllocation': 1, 'trafficTypeName': 'user', 'name': 'always-on6', 'seed': 1684183541, 'configurations': { 'off': "{color:'black'}" }, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': '' }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': { 'segmentName': '' }, 'unaryNumericMatcherData': { 'dataType': '', 'value': 0 }, 'whitelistMatcherData': { 'whitelist': null }, 'betweenMatcherData': { 'dataType': '', 'start': 0, 'end': 0 } }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }] }
};

const flagSetsMock = {
  reg_and_config: new _Set(['regular', 'config']),
  arch_and_killed: new _Set(['killed', 'archived']),
};

const mockStorage = {
  splits: {
    getSplit(name) {
      if (name === 'throw_exception') throw new Error('Error');
      if (splitsMock[name]) return splitsMock[name];

      return null;
    },
    getSplits(names) {
      const splits = {};
      names.forEach(name => {
        splits[name] = this.getSplit(name);
      });

      return splits;
    },
    getNamesByFlagsets(flagSets) {
      let toReturn = new _Set([]);
      flagSets.forEach(flagset => {
        const featureFlagNames = flagSetsMock[flagset];
        if (featureFlagNames) {
          toReturn = returnSetsUnion(toReturn, featureFlagNames);
        }
      });
      return toReturn;
    }
  }
};

test('EVALUATOR - Multiple evaluations at once  / should return label exception, treatment control and config null on error', async function () {
  const expectedOutput = {
    throw_exception: {
      treatment: 'control',
      label: LabelsConstants.EXCEPTION,
      config: null
    }
  };

  // This validation is async because the only exception possible when retrieving a Split would happen with Async storages.
  const evaluation = await evaluateFeatures(
    loggerMock,
    'fake-key',
    ['throw_exception'],
    null,
    mockStorage,
  );

  expect(evaluation).toEqual(expectedOutput); // If there was an error on the `getSplits` we should get the results for exception.

});


test('EVALUATOR - Multiple evaluations at once / should return right labels, treatments and configs if storage returns without errors.', async function () {
  const expectedOutput = {
    config: {
      treatment: 'on', label: 'in segment all',
      config: '{color:\'black\'}', changeNumber: 1487277320548
    },
    not_existent_split: {
      treatment: 'control', label: LabelsConstants.SPLIT_NOT_FOUND, config: null
    },
  };

  const multipleEvaluationAtOnce = await evaluateFeatures(
    loggerMock,
    'fake-key',
    ['config', 'not_existent_split', 'regular', 'killed', 'archived', 'trafficAlocation1', 'killedWithConfig', 'archivedWithConfig', 'trafficAlocation1WithConfig'],
    null,
    mockStorage,
  );
  // assert evaluationWithConfig
  expect(multipleEvaluationAtOnce['config']).toEqual(expectedOutput['config']); // If the split is retrieved successfully we should get the right evaluation result, label and config.
  // assert evaluationNotFound
  expect(multipleEvaluationAtOnce['not_existent_split']).toEqual(expectedOutput['not_existent_split']); // If the split is not retrieved successfully because it does not exist, we should get the right evaluation result, label and config.
  // assert regular
  expect(multipleEvaluationAtOnce['regular']).toEqual({ ...expectedOutput['config'], config: null }); // If the split is retrieved successfully we should get the right evaluation result, label and config. If Split has no config it should have config equal null.
  // assert killed
  expect(multipleEvaluationAtOnce['killed']).toEqual({ ...expectedOutput['config'], treatment: 'off', config: null, label: LabelsConstants.SPLIT_KILLED });
  // 'If the split is retrieved but is killed, we should get the right evaluation result, label and config.

  // assert archived
  expect(multipleEvaluationAtOnce['archived']).toEqual({ ...expectedOutput['config'], treatment: 'control', label: LabelsConstants.SPLIT_ARCHIVED, config: null });
  // If the split is retrieved but is archived, we should get the right evaluation result, label and config.

  // assert trafficAllocation1
  expect(multipleEvaluationAtOnce['trafficAlocation1']).toEqual({ ...expectedOutput['config'], label: LabelsConstants.NOT_IN_SPLIT, config: null, treatment: 'off' });
  // If the split is retrieved but is not in split (out of Traffic Allocation), we should get the right evaluation result, label and config.

  // assert killedWithConfig
  expect(multipleEvaluationAtOnce['killedWithConfig']).toEqual({ ...expectedOutput['config'], treatment: 'off', label: LabelsConstants.SPLIT_KILLED });
  // If the split is retrieved but is killed, we should get the right evaluation result, label and config.

  // assert archivedWithConfig
  expect(multipleEvaluationAtOnce['archivedWithConfig']).toEqual({ ...expectedOutput['config'], treatment: 'control', label: LabelsConstants.SPLIT_ARCHIVED, config: null });
  // If the split is retrieved but is archived, we should get the right evaluation result, label and config.

  // assert trafficAlocation1WithConfig
  expect(multipleEvaluationAtOnce['trafficAlocation1WithConfig']).toEqual({ ...expectedOutput['config'], label: LabelsConstants.NOT_IN_SPLIT, treatment: 'off' });
  // If the split is retrieved but is not in split (out of Traffic Allocation), we should get the right evaluation result, label and config.

});

test('EVALUATOR - Multiple evaluations at once by flagsets / should return right labels, treatments and configs if storage returns without errors.', async function () {
  const expectedOutput = {
    config: {
      treatment: 'on', label: 'in segment all',
      config: '{color:\'black\'}', changeNumber: 1487277320548
    },
    not_existent_split: {
      treatment: 'control', label: LabelsConstants.SPLIT_NOT_FOUND, config: null
    },
  };

  const multipleEvaluationAtOnce = await evaluateFeaturesByFlagSets(
    loggerMock,
    'fake-key',
    ['reg_and_config', 'arch_and_killed'],
    null,
    mockStorage,
  );

  // assert evaluationWithConfig
  expect(multipleEvaluationAtOnce['config']).toEqual(expectedOutput['config']); // If the split is retrieved successfully we should get the right evaluation result, label and config.
  // @todo assert flagset not found - for input validations

  // assert regular
  expect(multipleEvaluationAtOnce['regular']).toEqual({ ...expectedOutput['config'], config: null }); // If the split is retrieved successfully we should get the right evaluation result, label and config. If Split has no config it should have config equal null.
  // assert killed
  expect(multipleEvaluationAtOnce['killed']).toEqual({ ...expectedOutput['config'], treatment: 'off', config: null, label: LabelsConstants.SPLIT_KILLED });
  // 'If the split is retrieved but is killed, we should get the right evaluation result, label and config.

  // assert archived
  expect(multipleEvaluationAtOnce['archived']).toEqual({ ...expectedOutput['config'], treatment: 'control', label: LabelsConstants.SPLIT_ARCHIVED, config: null });
  // If the split is retrieved but is archived, we should get the right evaluation result, label and config.

  // assert not_existent_split not in evaluation if it is not related to defined flagsets
  expect(multipleEvaluationAtOnce['not_existent_split']).toEqual(undefined);

});
