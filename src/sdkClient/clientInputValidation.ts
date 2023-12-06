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
import { CONTROL, CONTROL_WITH_CONFIG, GET_TREATMENT, GET_TREATMENTS, GET_TREATMENTS_BY_FLAG_SET, GET_TREATMENTS_BY_FLAG_SETS, GET_TREATMENTS_WITH_CONFIG, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS, GET_TREATMENT_WITH_CONFIG, TRACK_FN_LABEL } from '../utils/constants';
import { IReadinessManager } from '../readiness/types';
import { MaybeThenable } from '../dtos/types';
import { ISettings, SplitIO } from '../types';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import { validateFlagSets } from '../utils/settingsValidation/splitFilters';

/**
 * Decorator that validates the input before actually executing the client methods.
 * We should "guard" the client here, while not polluting the "real" implementation of those methods.
 */
export function clientInputValidationDecorator<TClient extends SplitIO.IClient | SplitIO.IAsyncClient>(settings: ISettings, client: TClient, readinessManager: IReadinessManager): TClient {

  const { log, mode } = settings;
  const isAsync = isConsumerMode(mode);

  /**
   * Avoid repeating this validations code
   */
  function validateEvaluationParams(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNameOrNames: string | string[] | undefined, maybeAttributes: SplitIO.Attributes | undefined, methodName: string, maybeFlagSetNameOrNames?: string[]) {
    const multi = startsWith(methodName, GET_TREATMENTS);
    const key = validateKey(log, maybeKey, methodName);
    let splitOrSplits: string | string[] | false = false;
    let flagSetOrFlagSets: string[] = [];
    if (maybeFeatureFlagNameOrNames) {
      splitOrSplits = multi ? validateSplits(log, maybeFeatureFlagNameOrNames, methodName) : validateSplit(log, maybeFeatureFlagNameOrNames, methodName);
    }
    const attributes = validateAttributes(log, maybeAttributes, methodName);
    const isNotDestroyed = validateIfNotDestroyed(log, readinessManager, methodName);
    if (maybeFlagSetNameOrNames) {
      flagSetOrFlagSets = validateFlagSets(log, methodName, maybeFlagSetNameOrNames, settings.sync.__splitFiltersValidation.groupedFilters.bySet);
    }

    validateIfOperational(log, readinessManager, methodName, splitOrSplits);

    const valid = isNotDestroyed && key && (splitOrSplits || flagSetOrFlagSets.length > 0) && attributes !== false;

    return {
      valid,
      key,
      splitOrSplits,
      flagSetOrFlagSets,
      attributes
    };
  }

  function wrapResult<T>(value: T): MaybeThenable<T> {
    return isAsync ? Promise.resolve(value) : value;
  }

  function getTreatment(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagName, maybeAttributes, GET_TREATMENT);

    if (params.valid) {
      return client.getTreatment(params.key as SplitIO.SplitKey, params.splitOrSplits as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult(CONTROL);
    }
  }

  function getTreatmentWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagName, maybeAttributes, GET_TREATMENT_WITH_CONFIG);

    if (params.valid) {
      return client.getTreatmentWithConfig(params.key as SplitIO.SplitKey, params.splitOrSplits as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult(objectAssign({}, CONTROL_WITH_CONFIG));
    }
  }

  function getTreatments(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagNames, maybeAttributes, GET_TREATMENTS);

    if (params.valid) {
      return client.getTreatments(params.key as SplitIO.SplitKey, params.splitOrSplits as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      const res: SplitIO.Treatments = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach((split: string) => res[split] = CONTROL);

      return wrapResult(res);
    }
  }

  function getTreatmentsWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, maybeFeatureFlagNames, maybeAttributes, GET_TREATMENTS_WITH_CONFIG);

    if (params.valid) {
      return client.getTreatmentsWithConfig(params.key as SplitIO.SplitKey, params.splitOrSplits as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      const res: SplitIO.TreatmentsWithConfig = {};
      if (params.splitOrSplits) (params.splitOrSplits as string[]).forEach(split => res[split] = objectAssign({}, CONTROL_WITH_CONFIG));

      return wrapResult(res);
    }
  }

  function getTreatmentsByFlagSets(maybeKey: SplitIO.SplitKey, maybeFlagSets: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, undefined, maybeAttributes, GET_TREATMENTS_BY_FLAG_SETS, maybeFlagSets);

    if (params.valid) {
      return client.getTreatmentsByFlagSets(params.key as SplitIO.SplitKey, params.flagSetOrFlagSets as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult({});
    }
  }

  function getTreatmentsWithConfigByFlagSets(maybeKey: SplitIO.SplitKey, maybeFlagSets: string[], maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, undefined, maybeAttributes, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS, maybeFlagSets);

    if (params.valid) {
      return client.getTreatmentsWithConfigByFlagSets(params.key as SplitIO.SplitKey, params.flagSetOrFlagSets as string[], params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult({});
    }
  }

  function getTreatmentsByFlagSet(maybeKey: SplitIO.SplitKey, maybeFlagSet: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, undefined, maybeAttributes, GET_TREATMENTS_BY_FLAG_SET, [maybeFlagSet]);

    if (params.valid) {
      return client.getTreatmentsByFlagSet(params.key as SplitIO.SplitKey, params.flagSetOrFlagSets[0] as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult({});
    }
  }

  function getTreatmentsWithConfigByFlagSet(maybeKey: SplitIO.SplitKey, maybeFlagSet: string, maybeAttributes?: SplitIO.Attributes) {
    const params = validateEvaluationParams(maybeKey, undefined, maybeAttributes, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET, [maybeFlagSet]);

    if (params.valid) {
      return client.getTreatmentsWithConfigByFlagSet(params.key as SplitIO.SplitKey, params.flagSetOrFlagSets[0] as string, params.attributes as SplitIO.Attributes | undefined);
    } else {
      return wrapResult({});
    }
  }

  function track(maybeKey: SplitIO.SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: SplitIO.Properties) {
    const key = validateKey(log, maybeKey, TRACK_FN_LABEL);
    const tt = validateTrafficType(log, maybeTT, TRACK_FN_LABEL);
    const event = validateEvent(log, maybeEvent, TRACK_FN_LABEL);
    const eventValue = validateEventValue(log, maybeEventValue, TRACK_FN_LABEL);
    const { properties, size } = validateEventProperties(log, maybeProperties, TRACK_FN_LABEL);
    const isNotDestroyed = validateIfNotDestroyed(log, readinessManager, TRACK_FN_LABEL);

    if (isNotDestroyed && key && tt && event && eventValue !== false && properties !== false) { // @ts-expect-error
      return client.track(key, tt, event, eventValue, properties, size);
    } else {
      return isAsync ? Promise.resolve(false) : false;
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
    track
  } as TClient;
}
