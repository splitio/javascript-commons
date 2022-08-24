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
import { ISettings, SplitKey, Treatments, TreatmentsWithConfig, Properties, Attributes, IClient, IAsyncClient } from '../types';
import { isStorageSync } from '../trackers/impressionObserver/utils';
import { clientFactory } from './client';

/**
 * Decorator that validates the input before actually executing the client methods.
 * We should "guard" the client here, while not polluting the "real" implementation of those methods.
 */
export function clientInputValidationDecorator(settings: ISettings, client: ReturnType<typeof clientFactory>, readinessManager: IReadinessManager): IClient | IAsyncClient {

  const log = settings.log;
  const isSync = isStorageSync(settings);

  /**
   * Avoid repeating this validations code
   */
  function validateEvaluationParams(maybeKey: SplitKey, maybeSplitOrSplits: string | string[], maybeAttributes: Attributes | undefined, methodName: string) {
    const multi = startsWith(methodName, 'getTreatments');
    const key = validateKey(log, maybeKey, methodName);
    const splitOrSplits = multi ? validateSplits(log, maybeSplitOrSplits, methodName) : validateSplit(log, maybeSplitOrSplits, methodName);
    const attributes = validateAttributes(log, maybeAttributes, methodName);
    const isOperational = validateIfNotDestroyed(log, readinessManager, methodName);

    validateIfOperational(log, readinessManager, methodName);

    const valid = isOperational && key && splitOrSplits && attributes !== false;

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

  function getTreatment(maybeKey: SplitKey, maybeSplit: string, maybeAttributes?: Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplit, maybeAttributes, 'getTreatment');

    if (params.valid) {
      return client.getTreatment(params.key as SplitKey, params.splitOrSplits as string, params.attributes as Attributes | undefined);
    } else {
      return wrapResult(CONTROL);
    }
  }

  function getTreatmentWithConfig(maybeKey: SplitKey, maybeSplit: string, maybeAttributes?: Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplit, maybeAttributes, 'getTreatmentWithConfig');

    if (params.valid) {
      return client.getTreatmentWithConfig(params.key as SplitKey, params.splitOrSplits as string, params.attributes as Attributes | undefined);
    } else {
      return wrapResult(objectAssign({}, CONTROL_WITH_CONFIG));
    }
  }

  function getTreatments(maybeKey: SplitKey, maybeSplits: string[], maybeAttributes?: Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplits, maybeAttributes, 'getTreatments');

    if (params.valid) {
      return client.getTreatments(params.key as SplitKey, params.splitOrSplits as string[], params.attributes as Attributes | undefined);
    } else {
      const res: Treatments = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach((split: string) => res[split] = CONTROL);

      return wrapResult(res);
    }
  }

  function getTreatmentsWithConfig(maybeKey: SplitKey, maybeSplits: string[], maybeAttributes?: Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeSplits, maybeAttributes, 'getTreatmentsWithConfig');

    if (params.valid) {
      return client.getTreatmentsWithConfig(params.key as SplitKey, params.splitOrSplits as string[], params.attributes as Attributes | undefined);
    } else {
      const res: TreatmentsWithConfig = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach(split => res[split] = objectAssign({}, CONTROL_WITH_CONFIG));

      return wrapResult(res);
    }
  }

  function track(maybeKey: SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: Properties) {
    const key = validateKey(log, maybeKey, 'track');
    const tt = validateTrafficType(log, maybeTT, 'track');
    const event = validateEvent(log, maybeEvent, 'track');
    const eventValue = validateEventValue(log, maybeEventValue, 'track');
    const { properties, size } = validateEventProperties(log, maybeProperties, 'track');
    const isOperational = validateIfNotDestroyed(log, readinessManager, 'track');

    if (isOperational && key && tt && event && eventValue !== false && properties !== false) { // @ts-expect-error
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
  } as IClient | IAsyncClient;
}
