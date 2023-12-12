import { evaluateFeature, evaluateFeatures, evaluateFeaturesByFlagSets } from '../evaluator';
import { thenable } from '../utils/promise/thenable';
import { getMatching, getBucketing } from '../utils/key';
import { validateSplitExistence } from '../utils/inputValidation/splitExistence';
import { validateTrafficTypeExistence } from '../utils/inputValidation/trafficTypeExistence';
import { SDK_NOT_READY } from '../utils/labels';
import { CONTROL, TREATMENT, TREATMENTS, TREATMENT_WITH_CONFIG, TREATMENTS_WITH_CONFIG, TRACK, TREATMENTS_WITH_CONFIG_BY_FLAGSETS, TREATMENTS_BY_FLAGSETS, TREATMENTS_BY_FLAGSET, TREATMENTS_WITH_CONFIG_BY_FLAGSET, GET_TREATMENTS_WITH_CONFIG, GET_TREATMENTS_BY_FLAG_SETS, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS, GET_TREATMENTS_BY_FLAG_SET, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET, GET_TREATMENT_WITH_CONFIG, GET_TREATMENT, GET_TREATMENTS, TRACK_FN_LABEL } from '../utils/constants';
import { IEvaluationResult } from '../evaluator/types';
import { SplitIO, ImpressionDTO } from '../types';
import { IMPRESSION, IMPRESSION_QUEUEING } from '../logger/constants';
import { ISdkFactoryContext } from '../sdkFactory/types';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import { Method } from '../sync/submitters/types';

const treatmentNotReady = { treatment: CONTROL, label: SDK_NOT_READY };

function treatmentsNotReady(featureFlagNames: string[]) {
  const evaluations: Record<string, IEvaluationResult> = {};
  featureFlagNames.forEach(featureFlagName => {
    evaluations[featureFlagName] = treatmentNotReady;
  });
  return evaluations;
}

/**
 * Creator of base client with getTreatments and track methods.
 */
export function clientFactory(params: ISdkFactoryContext): SplitIO.IClient | SplitIO.IAsyncClient {
  const { sdkReadinessManager: { readinessManager }, storage, settings, impressionsTracker, eventTracker, telemetryTracker } = params;
  const { log, mode } = settings;
  const isAsync = isConsumerMode(mode);

  function getTreatment(key: SplitIO.SplitKey, featureFlagName: string, attributes: SplitIO.Attributes | undefined, withConfig = false, methodName = GET_TREATMENT) {
    const stopTelemetryTracker = telemetryTracker.trackEval(withConfig ? TREATMENT_WITH_CONFIG : TREATMENT);

    const wrapUp = (evaluationResult: IEvaluationResult) => {
      const queue: ImpressionDTO[] = [];
      const treatment = processEvaluation(evaluationResult, featureFlagName, key, attributes, withConfig, methodName, queue);
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].label);
      return treatment;
    };

    const evaluation = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeature(log, key, featureFlagName, attributes, storage) :
      isAsync ? // If the SDK is not ready, treatment may be incorrect due to having splits but not segments data, or storage is not connected
        Promise.resolve(treatmentNotReady) :
        treatmentNotReady;

    return thenable(evaluation) ? evaluation.then((res) => wrapUp(res)) : wrapUp(evaluation);
  }

  function getTreatmentWithConfig(key: SplitIO.SplitKey, featureFlagName: string, attributes: SplitIO.Attributes | undefined) {
    return getTreatment(key, featureFlagName, attributes, true, GET_TREATMENT_WITH_CONFIG);
  }

  function getTreatments(key: SplitIO.SplitKey, featureFlagNames: string[], attributes: SplitIO.Attributes | undefined, withConfig = false, methodName = GET_TREATMENTS) {
    const stopTelemetryTracker = telemetryTracker.trackEval(withConfig ? TREATMENTS_WITH_CONFIG : TREATMENTS);

    const wrapUp = (evaluationResults: Record<string, IEvaluationResult>) => {
      const queue: ImpressionDTO[] = [];
      const treatments: Record<string, SplitIO.Treatment | SplitIO.TreatmentWithConfig> = {};
      Object.keys(evaluationResults).forEach(featureFlagName => {
        treatments[featureFlagName] = processEvaluation(evaluationResults[featureFlagName], featureFlagName, key, attributes, withConfig, methodName, queue);
      });
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].label);
      return treatments;
    };

    const evaluations = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeatures(log, key, featureFlagNames, attributes, storage) :
      isAsync ? // If the SDK is not ready, treatment may be incorrect due to having splits but not segments data, or storage is not connected
        Promise.resolve(treatmentsNotReady(featureFlagNames)) :
        treatmentsNotReady(featureFlagNames);

    return thenable(evaluations) ? evaluations.then((res) => wrapUp(res)) : wrapUp(evaluations);
  }

  function getTreatmentsWithConfig(key: SplitIO.SplitKey, featureFlagNames: string[], attributes: SplitIO.Attributes | undefined) {
    return getTreatments(key, featureFlagNames, attributes, true, GET_TREATMENTS_WITH_CONFIG);
  }

  function getTreatmentsByFlagSets(key: SplitIO.SplitKey, flagSetNames: string[], attributes: SplitIO.Attributes | undefined, withConfig = false, method: Method = TREATMENTS_BY_FLAGSETS, methodName = GET_TREATMENTS_BY_FLAG_SETS) {
    const stopTelemetryTracker = telemetryTracker.trackEval(method);

    const wrapUp = (evaluationResults: Record<string, IEvaluationResult>) => {
      const queue: ImpressionDTO[] = [];
      const treatments: Record<string, SplitIO.Treatment | SplitIO.TreatmentWithConfig> = {};
      const evaluations = evaluationResults;
      Object.keys(evaluations).forEach(featureFlagName => {
        treatments[featureFlagName] = processEvaluation(evaluations[featureFlagName], featureFlagName, key, attributes, withConfig, methodName, queue);
      });
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].label);
      return treatments;
    };

    const evaluations = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeaturesByFlagSets(log, key, flagSetNames, attributes, storage, methodName) :
      isAsync ?
        Promise.resolve({}) :
        {};

    return thenable(evaluations) ? evaluations.then((res) => wrapUp(res)) : wrapUp(evaluations);
  }

  function getTreatmentsWithConfigByFlagSets(key: SplitIO.SplitKey, flagSetNames: string[], attributes: SplitIO.Attributes | undefined) {
    return getTreatmentsByFlagSets(key, flagSetNames, attributes, true, TREATMENTS_WITH_CONFIG_BY_FLAGSETS, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS);
  }

  function getTreatmentsByFlagSet(key: SplitIO.SplitKey, flagSetName: string, attributes: SplitIO.Attributes | undefined) {
    return getTreatmentsByFlagSets(key, [flagSetName], attributes, false, TREATMENTS_BY_FLAGSET, GET_TREATMENTS_BY_FLAG_SET);
  }

  function getTreatmentsWithConfigByFlagSet(key: SplitIO.SplitKey, flagSetName: string, attributes: SplitIO.Attributes | undefined) {
    return getTreatmentsByFlagSets(key, [flagSetName], attributes, true, TREATMENTS_WITH_CONFIG_BY_FLAGSET, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET);
  }

  // Internal function
  function processEvaluation(
    evaluation: IEvaluationResult,
    featureFlagName: string,
    key: SplitIO.SplitKey,
    attributes: SplitIO.Attributes | undefined,
    withConfig: boolean,
    invokingMethodName: string,
    queue: ImpressionDTO[]
  ): SplitIO.Treatment | SplitIO.TreatmentWithConfig {
    const matchingKey = getMatching(key);
    const bucketingKey = getBucketing(key);

    const { treatment, label, changeNumber, config = null } = evaluation;
    log.info(IMPRESSION, [featureFlagName, matchingKey, treatment, label]);

    if (validateSplitExistence(log, readinessManager, featureFlagName, label, invokingMethodName)) {
      log.info(IMPRESSION_QUEUEING);
      queue.push({
        feature: featureFlagName,
        keyName: matchingKey,
        treatment,
        time: Date.now(),
        bucketingKey,
        label,
        changeNumber: changeNumber as number
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
    isClientSide: false
  } as SplitIO.IClient | SplitIO.IAsyncClient;
}
