import { objectAssign } from '../utils/lang/objectAssign';
import {
  validateAttributes,
  validateEvent,
  validateEventValue,
  validateEventProperties,
  validateKey,
  validateSplit,
  validateSplits,
  validateTrafficType,
  validateIfNotDestroyed,
  validateIfOperational
} from '../utils/inputValidation';
import { startsWith } from '../utils/lang';
import { CONTROL, CONTROL_WITH_CONFIG } from '../utils/constants';
import { IReadinessManager } from '../readiness/types';
import { MaybeThenable } from '../dtos/types';
import { ISettings, SplitIO } from '../types';
import { isStorageSync } from '../trackers/impressionObserver/utils';

/**
 * Decorator that validates the input before actually executing the client methods.
 * We should "guard" the client here, while not polluting the "real" implementation of those methods.
 */
export function clientInputValidationDecorator<TClient extends SplitIO.IClient | SplitIO.IAsyncClient>(settings: ISettings, client: TClient, readinessManager: IReadinessManager): TClient {

  const log = settings.log;
  const isSync = isStorageSync(settings);

  /**
   * Avoid repeating this validations code
   */
  function validateEvaluationParams(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNameOrNames: string | string[], maybeAttributes: SplitIO.Attributes | undefined, methodName: string) {
    const multi = startsWith(methodName, 'getTreatments');
    const key = validateKey(log, maybeKey, methodName);
    const splitOrSplits = multi ? validateSplits(log, maybeFeatureFlagNameOrNames, methodName) : validateSplit(log, maybeFeatureFlagNameOrNames, methodName);
    const attributes = validateAttributes(log, maybeAttributes, methodName);
    const isNotDestroyed = validateIfNotDestroyed(log, readinessManager, methodName);

    validateIfOperational(log, readinessManager, methodName);

    const valid = isNotDestroyed && key && splitOrSplits && attributes !== false;

    return {
      valid,
      key,
      splitOrSplits,
      attributes
    };
  }

  function wrapResult<T>(value: T): MaybeThenable<T> {
    return isSync ? value : Promise.resolve(value);
  }

  function getTreatment(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagName, maybeAttributes, 'getTreatment');

    if (params.valid) {
      return client.getTreatment(params.key as SplitIO.SplitKey, params.splitOrSplits as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult(CONTROL);
    }
  }

  function getTreatmentWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagName, maybeAttributes, 'getTreatmentWithConfig');

    if (params.valid) {
      return client.getTreatmentWithConfig(params.key as SplitIO.SplitKey, params.splitOrSplits as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult(objectAssign({}, CONTROL_WITH_CONFIG));
    }
  }

  function getTreatments(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagNames, maybeAttributes, 'getTreatments');

    if (params.valid) {
      return client.getTreatments(params.key as SplitIO.SplitKey, params.splitOrSplits as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      const res: SplitIO.Treatments = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach((split: string) => res[split] = CONTROL);

      return wrapResult(res);
    }
  }

  function getTreatmentsWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagNames, maybeAttributes, 'getTreatmentsWithConfig');

    if (params.valid) {
      return client.getTreatmentsWithConfig(params.key as SplitIO.SplitKey, params.splitOrSplits as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      const res: SplitIO.TreatmentsWithConfig = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach(split => res[split] = objectAssign({}, CONTROL_WITH_CONFIG));

      return wrapResult(res);
    }
  }

  function track(maybeKey: SplitIO.SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: SplitIO.Properties) {
    const key = validateKey(log, maybeKey, 'track');
    const tt = validateTrafficType(log, maybeTT, 'track');
    const event = validateEvent(log, maybeEvent, 'track');
    const eventValue = validateEventValue(log, maybeEventValue, 'track');
    const { properties, size } = validateEventProperties(log, maybeProperties, 'track');
    const isNotDestroyed = validateIfNotDestroyed(log, readinessManager, 'track');

    if (isNotDestroyed && key && tt && event && eventValue !== false && properties !== false) { // @ts-expect-error
      return client.track(key, tt, event, eventValue, properties, size);
    } else {
      return isSync ? false : Promise.resolve(false);
    }
  }

  return {
    getTreatment,
    getTreatmentWithConfig,
    getTreatments,
    getTreatmentsWithConfig,
    track
  } as TClient;
}
