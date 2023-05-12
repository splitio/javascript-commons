import { evaluateFeature, evaluateFeatures } from '../evaluator';
import { thenable } from '../utils/promise/thenable';
import { getMatching, getBucketing } from '../utils/key';
import { validateSplitExistance } from '../utils/inputValidation/splitExistance';
import { validateTrafficTypeExistance } from '../utils/inputValidation/trafficTypeExistance';
import { SDK_NOT_READY } from '../utils/labels';
import { CONTROL, TREATMENT, TREATMENTS, TREATMENT_WITH_CONFIG, TREATMENTS_WITH_CONFIG, TRACK } from '../utils/constants';
import { IEvaluationResult } from '../evaluator/types';
import { SplitIO, ImpressionDTO } from '../types';
import { IMPRESSION, IMPRESSION_QUEUEING } from '../logger/constants';
import { ISdkFactoryContext } from '../sdkFactory/types';
import { isStorageSync } from '../trackers/impressionObserver/utils';

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

  function getTreatment(key: SplitIO.SplitKey, featureFlagName: string, attributes: SplitIO.Attributes | undefined, withConfig = false) {
    const stopTelemetryTracker = telemetryTracker.trackEval(withConfig ? TREATMENT_WITH_CONFIG : TREATMENT);

    const wrapUp = (evaluationResult: IEvaluationResult) => {
      const queue: ImpressionDTO[] = [];
      const treatment = processEvaluation(evaluationResult, featureFlagName, key, attributes, withConfig, `getTreatment${withConfig ? 'withConfig' : ''}`, queue);
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].label);
      return treatment;
    };

    const evaluation = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeature(log, key, featureFlagName, attributes, storage) :
      isStorageSync(settings) ? // If the SDK is not ready, treatment may be incorrect due to having splits but not segments data, or storage is not connected
        treatmentNotReady :
        Promise.resolve(treatmentNotReady); // Promisify if async

    return thenable(evaluation) ? evaluation.then((res) => wrapUp(res)) : wrapUp(evaluation);
  }

  function getTreatmentWithConfig(key: SplitIO.SplitKey, featureFlagName: string, attributes: SplitIO.Attributes | undefined) {
    return getTreatment(key, featureFlagName, attributes, true);
  }

  function getTreatments(key: SplitIO.SplitKey, featureFlagNames: string[], attributes: SplitIO.Attributes | undefined, withConfig = false) {
    const stopTelemetryTracker = telemetryTracker.trackEval(withConfig ? TREATMENTS_WITH_CONFIG : TREATMENTS);

    const wrapUp = (evaluationResults: Record<string, IEvaluationResult>) => {
      const queue: ImpressionDTO[] = [];
      const treatments: Record<string, SplitIO.Treatment | SplitIO.TreatmentWithConfig> = {};
      Object.keys(evaluationResults).forEach(featureFlagName => {
        treatments[featureFlagName] = processEvaluation(evaluationResults[featureFlagName], featureFlagName, key, attributes, withConfig, `getTreatments${withConfig ? 'withConfig' : ''}`, queue);
      });
      impressionsTracker.track(queue, attributes);

      stopTelemetryTracker(queue[0] && queue[0].label);
      return treatments;
    };

    const evaluations = readinessManager.isReady() || readinessManager.isReadyFromCache() ?
      evaluateFeatures(log, key, featureFlagNames, attributes, storage) :
      isStorageSync(settings) ? // If the SDK is not ready, treatment may be incorrect due to having splits but not segments data, or storage is not connected
        treatmentsNotReady(featureFlagNames) :
        Promise.resolve(treatmentsNotReady(featureFlagNames)); // Promisify if async

    return thenable(evaluations) ? evaluations.then((res) => wrapUp(res)) : wrapUp(evaluations);
  }

  function getTreatmentsWithConfig(key: SplitIO.SplitKey, featureFlagNames: string[], attributes: SplitIO.Attributes | undefined) {
    return getTreatments(key, featureFlagNames, attributes, true);
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

    if (validateSplitExistance(log, readinessManager, featureFlagName, label, invokingMethodName)) {
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
    validateTrafficTypeExistance(log, readinessManager, storage.splits, mode, trafficTypeName, 'track');

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
    track,
    isClientSide: false
  } as SplitIO.IClient | SplitIO.IAsyncClient;
}
