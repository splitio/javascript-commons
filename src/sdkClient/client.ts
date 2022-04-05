import { evaluateFeature, evaluateFeatures } from '../evaluator';
import { thenable } from '../utils/promise/thenable';
import { getMatching, getBucketing } from '../utils/key';
import { validateSplitExistance } from '../utils/inputValidation/splitExistance';
import { validateTrafficTypeExistance } from '../utils/inputValidation/trafficTypeExistance';
import { SDK_NOT_READY } from '../utils/labels';
import { CONTROL } from '../utils/constants';
import { IEvaluationResult } from '../evaluator/types';
import { SplitIO, ImpressionDTO } from '../types';
import { IMPRESSION, IMPRESSION_QUEUEING } from '../logger/constants';
import { ISdkFactoryContext } from '../sdkFactory/types';

/**
 * Creator of base client with getTreatments and track methods.
 */
// @TODO missing time tracking to collect telemetry
export function clientFactory(params: ISdkFactoryContext): SplitIO.IClient | SplitIO.IAsyncClient {
  const { sdkReadinessManager: { readinessManager }, storage, settings, impressionsTracker, eventTracker } = params;
  const { log, mode } = settings;

  function getTreatment(key: SplitIO.SplitKey, splitName: string, attributes: SplitIO.Attributes | undefined, withConfig = false) {
    const wrapUp = (evaluationResult: IEvaluationResult) => {
      const queue: ImpressionDTO[] = [];
      const treatment = processEvaluation(evaluationResult, splitName, key, attributes, withConfig, `getTreatment${withConfig ? 'withConfig' : ''}`, queue);
      impressionsTracker.track(queue, attributes);
      return treatment;
    };

    const evaluation = evaluateFeature(log, key, splitName, attributes, storage);

    return thenable(evaluation) ? evaluation.then((res) => wrapUp(res)) : wrapUp(evaluation);
  }

  function getTreatmentWithConfig(key: SplitIO.SplitKey, splitName: string, attributes: SplitIO.Attributes | undefined) {
    return getTreatment(key, splitName, attributes, true);
  }

  function getTreatments(key: SplitIO.SplitKey, splitNames: string[], attributes: SplitIO.Attributes | undefined, withConfig = false) {
    const wrapUp = (evaluationResults: Record<string, IEvaluationResult>) => {
      const queue: ImpressionDTO[] = [];
      const treatments: Record<string, SplitIO.Treatment | SplitIO.TreatmentWithConfig> = {};
      Object.keys(evaluationResults).forEach(splitName => {
        treatments[splitName] = processEvaluation(evaluationResults[splitName], splitName, key, attributes, withConfig, `getTreatments${withConfig ? 'withConfig' : ''}`, queue);
      });
      impressionsTracker.track(queue, attributes);
      return treatments;
    };

    const evaluations = evaluateFeatures(log, key, splitNames, attributes, storage);

    return thenable(evaluations) ? evaluations.then((res) => wrapUp(res)) : wrapUp(evaluations);
  }

  function getTreatmentsWithConfig(key: SplitIO.SplitKey, splitNames: string[], attributes: SplitIO.Attributes | undefined) {
    return getTreatments(key, splitNames, attributes, true);
  }

  // Internal function
  function processEvaluation(
    evaluation: IEvaluationResult,
    splitName: string,
    key: SplitIO.SplitKey,
    attributes: SplitIO.Attributes | undefined,
    withConfig: boolean,
    invokingMethodName: string,
    queue: ImpressionDTO[]
  ): SplitIO.Treatment | SplitIO.TreatmentWithConfig {
    const isSdkReady = readinessManager.isReady() || readinessManager.isReadyFromCache();
    const matchingKey = getMatching(key);
    const bucketingKey = getBucketing(key);

    // If the SDK was not ready, treatment may be incorrect due to having Splits but not segments data.
    if (!isSdkReady) {
      evaluation = { treatment: CONTROL, label: SDK_NOT_READY };
    }

    const { treatment, label, changeNumber, config = null } = evaluation;
    log.info(IMPRESSION, [splitName, matchingKey, treatment, label]);

    if (validateSplitExistance(log, readinessManager, splitName, label, invokingMethodName)) {
      log.info(IMPRESSION_QUEUEING);
      queue.push({
        feature: splitName,
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

    return eventTracker.track(eventData, size);
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
