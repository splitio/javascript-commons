import { engineParser } from './Engine';
import { thenable } from '../utils/promise/thenable';
import { EXCEPTION, NO_CONDITION_MATCH, DEFINITION_NOT_FOUND } from '../utils/labels';
import { CONTROL } from '../utils/constants';
import { IDefinition, MaybeThenable } from '../dtos/types';
import { IStorageAsync, IStorageSync } from '../storages/types';
import { IEvaluationResult } from './types';
import SplitIO from '../../types/splitio';
import { ILogger } from '../logger/types';
import { returnSetsUnion, setToArray } from '../utils/lang/sets';
import { WARN_FLAGSET_WITHOUT_FLAGS } from '../logger/constants';

const EVALUATION_EXCEPTION = {
  treatment: CONTROL,
  label: EXCEPTION,
  config: null
};

const EVALUATION_DEFINITION_NOT_FOUND = {
  treatment: CONTROL,
  label: DEFINITION_NOT_FOUND,
  config: null
};

function treatmentsException(definitionNames: string[]) {
  const evaluations: Record<string, IEvaluationResult> = {};
  definitionNames.forEach(definitionName => {
    evaluations[definitionName] = EVALUATION_EXCEPTION;
  });
  return evaluations;
}

export function evaluateFeature(
  log: ILogger,
  key: SplitIO.SplitKey,
  definitionName: string,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  options?: SplitIO.EvaluationOptions
): MaybeThenable<IEvaluationResult> {
  let definition;

  try {
    definition = storage.splits.getSplit(definitionName);
  } catch (e) {
    // Exception on sync `getSplit` storage. Not possible ATM with InMemory and InLocal storages.
    return EVALUATION_EXCEPTION;
  }

  if (thenable(definition)) {
    return definition.then((definition) => getEvaluation(
      log,
      key,
      definition,
      attributes,
      storage,
      options,
    )).catch(
      // Exception on async `getSplit` storage. For example, when the storage is redis or
      // pluggable and there is a connection issue and we can't retrieve the split to be evaluated
      () => EVALUATION_EXCEPTION
    );
  }

  return getEvaluation(
    log,
    key,
    definition,
    attributes,
    storage,
    options,
  );
}

export function evaluateFeatures(
  log: ILogger,
  key: SplitIO.SplitKey,
  definitionNames: string[],
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  options?: SplitIO.EvaluationOptions,
): MaybeThenable<Record<string, IEvaluationResult>> {
  let definitions;

  try {
    definitions = storage.splits.getSplits(definitionNames);
  } catch (e) {
    // Exception on sync `getSplits` storage. Not possible ATM with InMemory and InLocal storages.
    return treatmentsException(definitionNames);
  }

  return thenable(definitions) ?
    definitions.then(definitions => getEvaluations(log, key, definitionNames, definitions, attributes, storage, options))
      .catch(() => {
        // Exception on async `getSplits` storage. For example, when the storage is redis or
        // pluggable and there is a connection issue and we can't retrieve the split to be evaluated
        return treatmentsException(definitionNames);
      }) :
    getEvaluations(log, key, definitionNames, definitions, attributes, storage, options);
}

export function evaluateFeaturesByFlagSets(
  log: ILogger,
  key: SplitIO.SplitKey,
  flagSets: string[],
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  method: string,
  options?: SplitIO.EvaluationOptions,
): MaybeThenable<Record<string, IEvaluationResult>> {
  let storedFlagNames: MaybeThenable<Set<string>[]>;

  function evaluate(featureFlagsByFlagSets: Set<string>[]) {
    let featureFlags = new Set<string>();
    for (let i = 0; i < flagSets.length; i++) {
      const featureFlagByFlagSet = featureFlagsByFlagSets[i];
      if (featureFlagByFlagSet.size) {
        featureFlags = returnSetsUnion(featureFlags, featureFlagByFlagSet);
      } else {
        log.warn(WARN_FLAGSET_WITHOUT_FLAGS, [method, flagSets[i]]);
      }
    }

    return featureFlags.size ?
      evaluateFeatures(log, key, setToArray(featureFlags), attributes, storage, options) :
      {};
  }

  // get features by flag sets
  try {
    storedFlagNames = storage.splits.getNamesByFlagSets(flagSets);
  } catch (e) {
    // return empty evaluations
    return {};
  }

  // evaluate related features
  return thenable(storedFlagNames) ?
    storedFlagNames.then((storedFlagNames) => evaluate(storedFlagNames))
      .catch(() => {
        return {};
      }) :
    evaluate(storedFlagNames);
}

function getEvaluation(
  log: ILogger,
  key: SplitIO.SplitKey,
  definition: IDefinition | null,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  options?: SplitIO.EvaluationOptions,
): MaybeThenable<IEvaluationResult> {

  if (definition) {
    const split = engineParser(log, definition, storage);
    const evaluation = split.getTreatment(key, attributes, evaluateFeature);

    // If the storage is async and the evaluated flag uses segments or dependencies, evaluation is thenable
    if (thenable(evaluation)) {
      return evaluation.then(result => {
        result.changeNumber = definition.changeNumber;
        result.config = definition.configurations && definition.configurations[result.treatment] || null;
        // @ts-expect-error impressionsDisabled is not exposed in the public typings yet.
        result.impressionsDisabled = options?.impressionsDisabled || definition.impressionsDisabled;

        return result;
      });
    } else {
      evaluation.changeNumber = definition.changeNumber;
      evaluation.config = definition.configurations && definition.configurations[evaluation.treatment] || null;
      // @ts-expect-error impressionsDisabled is not exposed in the public typings yet.
      evaluation.impressionsDisabled = options?.impressionsDisabled || definition.impressionsDisabled;
    }

    return evaluation;
  }

  return EVALUATION_DEFINITION_NOT_FOUND;
}

function getEvaluations(
  log: ILogger,
  key: SplitIO.SplitKey,
  definitionNames: string[],
  splits: Record<string, IDefinition | null>,
  attributes: SplitIO.Attributes | undefined,
  storage: IStorageSync | IStorageAsync,
  options?: SplitIO.EvaluationOptions,
): MaybeThenable<Record<string, IEvaluationResult>> {
  const result: Record<string, IEvaluationResult> = {};
  const thenables: Promise<void>[] = [];
  definitionNames.forEach(definitionName => {
    const evaluation = getEvaluation(
      log,
      key,
      splits[definitionName],
      attributes,
      storage,
      options
    );
    if (thenable(evaluation)) {
      thenables.push(evaluation.then(res => {
        result[definitionName] = res;
      }));
    } else {
      result[definitionName] = evaluation;
    }
  });

  return thenables.length > 0 ? Promise.all(thenables).then(() => result) : result;
}

export function evaluateDefaultTreatment(
  definitionName: string,
  storage: IStorageSync | IStorageAsync,
): MaybeThenable<IEvaluationResult> {
  let definition;

  try {
    definition = storage.splits.getSplit(definitionName);
  } catch (e) {
    return EVALUATION_EXCEPTION;
  }

  return thenable(definition) ?
    definition.then(getDefaultTreatment).catch(() => EVALUATION_EXCEPTION) :
    getDefaultTreatment(definition);
}

function getDefaultTreatment(
  definition: IDefinition | null,
): MaybeThenable<IEvaluationResult> {
  if (definition) {
    return {
      treatment: definition.defaultTreatment,
      label: NO_CONDITION_MATCH, // "default rule"
      config: definition.configurations && definition.configurations[definition.defaultTreatment] || null,
      changeNumber: definition.changeNumber
    };
  }

  return EVALUATION_DEFINITION_NOT_FOUND;
}
