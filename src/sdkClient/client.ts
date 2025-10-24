import { evaluateFeature, evaluateFeatures, evaluateFeaturesByFlagSets } from '../evaluator';
import { thenable } from '../utils/promise/thenable';
import { getMatching, getBucketing } from '../utils/key';
import { validateSplitExistence } from '../utils/inputValidation/splitExistence';
import { validateTrafficTypeExistence } from '../utils/inputValidation/trafficTypeExistence';
import { SDK_NOT_READY } from '../utils/labels';
import { CONTROL, TREATMENT, TREATMENTS, TREATMENT_WITH_CONFIG, TREATMENTS_WITH_CONFIG, TRACK, TREATMENTS_WITH_CONFIG_BY_FLAGSETS, TREATMENTS_BY_FLAGSETS, TREATMENTS_BY_FLAGSET, TREATMENTS_WITH_CONFIG_BY_FLAGSET, GET_TREATMENTS_WITH_CONFIG, GET_TREATMENTS_BY_FLAG_SETS, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS, GET_TREATMENTS_BY_FLAG_SET, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET, GET_TREATMENT_WITH_CONFIG, GET_TREATMENT, GET_TREATMENTS, TRACK_FN_LABEL } from '../utils/constants';
import { IEvaluationResult } from '../evaluator/types';
import SplitIO from '../../types/splitio';
import { IMPRESSION, IMPRESSION_QUEUEING } from '../logger/constants';
import { ISdkFactoryContext } from '../sdkFactory/types';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import { Method } from '../sync/submitters/types';
import { ImpressionDecorated } from '../trackers/types';

const treatmentNotReady = { treatment: CONTROL, label: SDK_NOT_READY };

function treatmentsNotReady(featureFlagNames: string[]) {
  const evaluations: Record<string, IEvaluationResult> = {};
  featureFlagNames.forEach(featureFlagName => {
    evaluations[featureFlagName] = treatmentNotReady;
  });
  return evaluations;
}

function stringify(options?: SplitIO.EvaluationOptions) {
  if (options && options.properties) {
    try {
      return JSON.stringify(options.properties);
    } catch { /* JSON.stringify should never throw with validated options, but handling just in case */ }
  }
}

/**
 * Creator of base client with getTreatments and track methods.
 */
export function clientFactory(params: ISdkFactoryContext): SplitIO.IClient | SplitIO.IAsyncClient {
  const { sdkReadinessManager: { readinessManager }, storage, settings, impressionsTracker, eventTracker, telemetryTracker, fallbackTreatmentsCalculator } = params;
  const { log, mode } = settings;
  const isAsync = isConsumerMode(mode);

  function getTreatment(key: SplitIO.SplitKey, featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions, withConfig = false, methodName = GET_TREATMENT) {
    const stopTelemetryTracker = telemetryTracker.trackEval(withConfig ? TREATMENT_WITH_CONFIG : TREATMENT);

    const wrapUp = (evaluationResult: IEvaluationResult) => {
      const queue: ImpressionDecorated[] = [];
      const treatment = processEvaluation(evaluationResult, featureFlagName, key, stringify(options), withConfig, methodName, queue);
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].imp.label);
      return treatment;
    };

    const evaluation = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeature(log, key, featureFlagName, attributes, storage) :
      isAsync ? // If the SDK is not ready, treatment may be incorrect due to having splits but not segments data, or storage is not connected
        Promise.resolve(treatmentNotReady) :
        treatmentNotReady;

    return thenable(evaluation) ? evaluation.then((res) => wrapUp(res)) : wrapUp(evaluation);
  }

  function getTreatmentWithConfig(key: SplitIO.SplitKey, featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions) {
    return getTreatment(key, featureFlagName, attributes, options, true, GET_TREATMENT_WITH_CONFIG);
  }

  function getTreatments(key: SplitIO.SplitKey, featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions, withConfig = false, methodName = GET_TREATMENTS) {
    const stopTelemetryTracker = telemetryTracker.trackEval(withConfig ? TREATMENTS_WITH_CONFIG : TREATMENTS);

    const wrapUp = (evaluationResults: Record<string, IEvaluationResult>) => {
      const queue: ImpressionDecorated[] = [];
      const treatments: SplitIO.Treatments | SplitIO.TreatmentsWithConfig = {};
      const properties = stringify(options);
      Object.keys(evaluationResults).forEach(featureFlagName => {
        treatments[featureFlagName] = processEvaluation(evaluationResults[featureFlagName], featureFlagName, key, properties, withConfig, methodName, queue);
      });
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].imp.label);
      return treatments;
    };

    const evaluations = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeatures(log, key, featureFlagNames, attributes, storage) :
      isAsync ? // If the SDK is not ready, treatment may be incorrect due to having splits but not segments data, or storage is not connected
        Promise.resolve(treatmentsNotReady(featureFlagNames)) :
        treatmentsNotReady(featureFlagNames);

    return thenable(evaluations) ? evaluations.then((res) => wrapUp(res)) : wrapUp(evaluations);
  }

  function getTreatmentsWithConfig(key: SplitIO.SplitKey, featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions) {
    return getTreatments(key, featureFlagNames, attributes, options, true, GET_TREATMENTS_WITH_CONFIG);
  }

  function getTreatmentsByFlagSets(key: SplitIO.SplitKey, flagSetNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions, withConfig = false, method: Method = TREATMENTS_BY_FLAGSETS, methodName = GET_TREATMENTS_BY_FLAG_SETS) {
    const stopTelemetryTracker = telemetryTracker.trackEval(method);

    const wrapUp = (evaluationResults: Record<string, IEvaluationResult>) => {
      const queue: ImpressionDecorated[] = [];
      const treatments: SplitIO.Treatments | SplitIO.TreatmentsWithConfig = {};
      const properties = stringify(options);
      Object.keys(evaluationResults).forEach(featureFlagName => {
        treatments[featureFlagName] = processEvaluation(evaluationResults[featureFlagName], featureFlagName, key, properties, withConfig, methodName, queue);
      });
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].imp.label);
      return treatments;
    };

    const evaluations = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeaturesByFlagSets(log, key, flagSetNames, attributes, storage, methodName) :
      isAsync ?
        Promise.resolve({}) :
        {};

    return thenable(evaluations) ? evaluations.then((res) => wrapUp(res)) : wrapUp(evaluations);
  }

  function getTreatmentsWithConfigByFlagSets(key: SplitIO.SplitKey, flagSetNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions) {
    return getTreatmentsByFlagSets(key, flagSetNames, attributes, options, true, TREATMENTS_WITH_CONFIG_BY_FLAGSETS, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS);
  }

  function getTreatmentsByFlagSet(key: SplitIO.SplitKey, flagSetName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions) {
    return getTreatmentsByFlagSets(key, [flagSetName], attributes, options, false, TREATMENTS_BY_FLAGSET, GET_TREATMENTS_BY_FLAG_SET);
  }

  function getTreatmentsWithConfigByFlagSet(key: SplitIO.SplitKey, flagSetName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions) {
    return getTreatmentsByFlagSets(key, [flagSetName], attributes, options, true, TREATMENTS_WITH_CONFIG_BY_FLAGSET, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET);
  }

  // Internal function
  function processEvaluation(
    evaluation: IEvaluationResult,
    featureFlagName: string,
    key: SplitIO.SplitKey,
    properties: string | undefined,
    withConfig: boolean,
    invokingMethodName: string,
    queue: ImpressionDecorated[]
  ): SplitIO.Treatment | SplitIO.TreatmentWithConfig {
    const matchingKey = getMatching(key);
    const bucketingKey = getBucketing(key);

    const { changeNumber, impressionsDisabled } = evaluation;
    let { treatment, label, config = null } = evaluation;

    if (treatment === CONTROL) {
      const fallbackTreatment = fallbackTreatmentsCalculator.resolve(featureFlagName, label);
      treatment = fallbackTreatment.treatment;
      label = fallbackTreatment.label ? fallbackTreatment.label : label;
      config = fallbackTreatment.config;
    }

    log.info(IMPRESSION, [featureFlagName, matchingKey, treatment, label]);

    if (validateSplitExistence(log, readinessManager, featureFlagName, label, invokingMethodName)) {
      log.info(IMPRESSION_QUEUEING);
      queue.push({
        imp: {
          feature: featureFlagName,
          keyName: matchingKey,
          treatment,
          time: Date.now(),
          bucketingKey,
          label,
          changeNumber: changeNumber as number,
          properties
        },
        disabled: impressionsDisabled
      });
    }

    if (withConfig) {
      return {
        treatment,
        config
      };
    }

    return treatment;
  }

  function track(key: SplitIO.SplitKey, trafficTypeName: string, eventTypeId: string, value?: number, properties?: SplitIO.Properties, size = 1024) {
    const stopTelemetryTracker = telemetryTracker.trackEval(TRACK);

    const matchingKey = getMatching(key);
    const timestamp = Date.now();
    const eventData: SplitIO.EventData = {
      eventTypeId,
      trafficTypeName,
      value,
      timestamp,
      key: matchingKey,
      properties
    };

    // This may be async but we only warn, we don't actually care if it is valid or not in terms of queueing the event.
    validateTrafficTypeExistence(log, readinessManager, storage.splits, mode, trafficTypeName, TRACK_FN_LABEL);

    const result = eventTracker.track(eventData, size);

    if (thenable(result)) {
      return result.then((result) => {
        stopTelemetryTracker();
        return result;
      });
    } else {
      stopTelemetryTracker();
      return result;
    }
  }

  return {
    getTreatment,
    getTreatmentWithConfig,
    getTreatments,
    getTreatmentsWithConfig,
    getTreatmentsByFlagSets,
    getTreatmentsWithConfigByFlagSets,
    getTreatmentsByFlagSet,
    getTreatmentsWithConfigByFlagSet,
    track,
  } as SplitIO.IClient | SplitIO.IAsyncClient;
}
