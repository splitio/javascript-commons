import objectAssign from 'object-assign';
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
import { SplitIO } from '../types';

/**
 * Decorator that validates the input before actually executing the client methods.
 * We should "guard" the client here, while not polluting the "real" implementation of those methods.
 */
export default function clientInputValidationDecorator<TClient extends SplitIO.IClient | SplitIO.IAsyncClient>(client: TClient, readinessManager: IReadinessManager, isStorageSync = false): TClient {

  /**
   * Avoid repeating this validations code
   */
  function validateEvaluationParams(maybeKey: SplitIO.SplitKey, maybeSplitOrSplits: string | string[], maybeAttributes: SplitIO.Attributes | undefined, methodName: string) {
    const multi = startsWith(methodName, 'getTreatments');
    const key = validateKey(maybeKey, methodName);
    const splitOrSplits = multi ? validateSplits(maybeSplitOrSplits, methodName) : validateSplit(maybeSplitOrSplits, methodName);
    const attributes = validateAttributes(maybeAttributes, methodName);
    const isOperational = validateIfNotDestroyed(readinessManager);

    validateIfOperational(readinessManager, methodName);

    const valid = isOperational && key && splitOrSplits && attributes !== false;

    return {
      valid,
      key,
      splitOrSplits,
      attributes
    };
  }

  function wrapResult<T>(value: T): MaybeThenable<T> {
    if (isStorageSync) return value;
    return Promise.resolve(value);
  }

  function getTreatment(maybeKey: SplitIO.SplitKey, maybeSplit: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplit, maybeAttributes, 'getTreatment');

    if (params.valid) {
      return client.getTreatment(params.key as SplitIO.SplitKey, params.splitOrSplits as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult(CONTROL);
    }
  }

  function getTreatmentWithConfig(maybeKey: SplitIO.SplitKey, maybeSplit: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplit, maybeAttributes, 'getTreatmentWithConfig');

    if (params.valid) {
      return client.getTreatmentWithConfig(params.key as SplitIO.SplitKey, params.splitOrSplits as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult(objectAssign({}, CONTROL_WITH_CONFIG));
    }
  }

  function getTreatments(maybeKey: SplitIO.SplitKey, maybeSplits: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplits, maybeAttributes, 'getTreatments');

    if (params.valid) {
      return client.getTreatments(params.key as SplitIO.SplitKey, params.splitOrSplits as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      const res: SplitIO.Treatments = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach((split: string) => res[split] = CONTROL);

      return wrapResult(res);
    }
  }

  function getTreatmentsWithConfig(maybeKey: SplitIO.SplitKey, maybeSplits: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplits, maybeAttributes, 'getTreatmentsWithConfig');

    if (params.valid) {
      return client.getTreatmentsWithConfig(params.key as SplitIO.SplitKey, params.splitOrSplits as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      const res: SplitIO.TreatmentsWithConfig = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach(split => res[split] = objectAssign({}, CONTROL_WITH_CONFIG));

      return wrapResult(res);
    }
  }

  function track(maybeKey: SplitIO.SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: SplitIO.Properties) {
    const key = validateKey(maybeKey, 'track');
    const tt = validateTrafficType(maybeTT, 'track');
    const event = validateEvent(maybeEvent, 'track');
    const eventValue = validateEventValue(maybeEventValue, 'track');
    const { properties, size } = validateEventProperties(maybeProperties, 'track');
    const isOperational = validateIfNotDestroyed(readinessManager);

    if (isOperational && key && tt && event && eventValue !== false && properties !== false) { // @ts-expect-error
      return client.track(key, tt, event, eventValue, properties, size);
    } else {
      if (isStorageSync) return false;
      return Promise.resolve(false);
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
