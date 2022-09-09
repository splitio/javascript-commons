// @ts-nocheck
import { evaluateFeature } from '../index';
import * as LabelsConstants from '../../utils/labels';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';

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

const mockStorage = {
  splits: {
    getSplit(name) {
      if (name === 'throw_exception') throw new Error('Error');
      if (splitsMock[name]) return splitsMock[name];

      return null;
    }
  }
};

test('EVALUATOR / should return label exception, treatment control and config null on error', async function () {
  const expectedOutput = {
    treatment: 'control',
    label: LabelsConstants.EXCEPTION,
    config: null
  };
  const evaluationPromise = evaluateFeature(
    loggerMock,
    'fake-key',
    'throw_exception',
    null,
    mockStorage,
  );

  // This validation is async because the only exception possible when retrieving a Split would happen with Async storages.
  const evaluation = await evaluationPromise;

  expect(evaluation).toEqual(expectedOutput); // If there was an error on the getSplits we should get the results for exception.
});


test('EVALUATOR / should return right label, treatment and config if storage returns without errors.', async function () {
  const expectedOutput = {
    treatment: 'on', label: 'in segment all',
    config: '{color:\'black\'}', changeNumber: 1487277320548
  };
  const expectedOutputControl = {
    treatment: 'control', label: LabelsConstants.SPLIT_NOT_FOUND, config: null
  };

  const evaluationWithConfig = evaluateFeature(
    loggerMock,
    'fake-key',
    'config',
    null,
    mockStorage,
  );
  expect(evaluationWithConfig).toEqual(expectedOutput); // If the split is retrieved successfully we should get the right evaluation result, label and config.

  const evaluationNotFound = evaluateFeature(
    loggerMock,
    'fake-key',
    'not_existent_split',
    null,
    mockStorage,
  );
  expect(evaluationNotFound).toEqual(expectedOutputControl); // If the split is not retrieved successfully because it does not exist, we should get the right evaluation result, label and config.

  const evaluation = evaluateFeature(
    loggerMock,
    'fake-key',
    'regular',
    null,
    mockStorage,
  );
  expect(evaluation).toEqual({ ...expectedOutput, config: null }); // If the split is retrieved successfully we should get the right evaluation result, label and config. If Split has no config it should have config equal null.

  const evaluationKilled = evaluateFeature(
    loggerMock,
    'fake-key',
    'killed',
    null,
    mockStorage,
  );
  expect(evaluationKilled).toEqual({ ...expectedOutput, treatment: 'off', config: null, label: LabelsConstants.SPLIT_KILLED });
  // If the split is retrieved but is killed, we should get the right evaluation result, label and config.

  const evaluationArchived = evaluateFeature(
    loggerMock,
    'fake-key',
    'archived',
    null,
    mockStorage,
  );
  expect(evaluationArchived).toEqual({ ...expectedOutput, treatment: 'control', label: LabelsConstants.SPLIT_ARCHIVED, config: null });
  // If the split is retrieved but is archived, we should get the right evaluation result, label and config.

  const evaluationtrafficAlocation1 = evaluateFeature(
    loggerMock,
    'fake-key',
    'trafficAlocation1',
    null,
    mockStorage,
  );
  expect(evaluationtrafficAlocation1).toEqual({ ...expectedOutput, label: LabelsConstants.NOT_IN_SPLIT, config: null, treatment: 'off' });
  // If the split is retrieved but is not in split (out of Traffic Allocation), we should get the right evaluation result, label and config.

  const evaluationKilledWithConfig = evaluateFeature(
    loggerMock,
    'fake-key',
    'killedWithConfig',
    null,
    mockStorage,
  );
  expect(evaluationKilledWithConfig).toEqual({ ...expectedOutput, treatment: 'off', label: LabelsConstants.SPLIT_KILLED });
  // If the split is retrieved but is killed, we should get the right evaluation result, label and config.

  const evaluationArchivedWithConfig = evaluateFeature(
    loggerMock,
    'fake-key',
    'archivedWithConfig',
    null,
    mockStorage,
  );
  expect(evaluationArchivedWithConfig).toEqual({ ...expectedOutput, treatment: 'control', label: LabelsConstants.SPLIT_ARCHIVED, config: null });
  // If the split is retrieved but is archived, we should get the right evaluation result, label and config.

  const evaluationtrafficAlocation1WithConfig = evaluateFeature(
    loggerMock,
    'fake-key',
    'trafficAlocation1WithConfig',
    null,
    mockStorage,
  );
  expect(evaluationtrafficAlocation1WithConfig).toEqual({ ...expectedOutput, label: LabelsConstants.NOT_IN_SPLIT, treatment: 'off' });
  // If the split is retrieved but is not in split (out of Traffic Allocation), we should get the right evaluation result, label and config.

});
