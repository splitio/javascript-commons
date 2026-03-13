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
  validateIfReadyFromCache,
  validateEvaluationOptions
} from '../utils/inputValidation';
import { startsWith } from '../utils/lang';
import { GET_TREATMENT, GET_TREATMENTS, GET_TREATMENTS_BY_FLAG_SET, GET_TREATMENTS_BY_FLAG_SETS, GET_TREATMENTS_WITH_CONFIG, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET, GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS, GET_TREATMENT_WITH_CONFIG, TRACK_FN_LABEL } from '../utils/constants';
import { IReadinessManager } from '../readiness/types';
import { MaybeThenable } from '../dtos/types';
import { ISettings } from '../types';
import SplitIO from '../../types/splitio';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import { validateFlagSets } from '../utils/settingsValidation/splitFilters';
import { IFallbackTreatmentsCalculator } from '../evaluator/fallbackTreatmentsCalculator';

/**
 * Decorator that validates the input before actually executing the client methods.
 * We should "guard" the client here, while not polluting the "real" implementation of those methods.
 */
export function clientInputValidationDecorator<TClient extends SplitIO.IClient | SplitIO.IAsyncClient>(settings: ISettings, client: TClient, readinessManager: IReadinessManager, fallbackTreatmentsCalculator: IFallbackTreatmentsCalculator): TClient {

  const { log, mode } = settings;
  const isAsync = isConsumerMode(mode);

  /**
   * Avoid repeating this validations code
   */
  function validateEvaluationParams(methodName: string, maybeKey: SplitIO.SplitKey, maybeNameOrNames: string | string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const key = validateKey(log, maybeKey, methodName);

    const nameOrNames = methodName.indexOf('ByFlagSet') > -1 ?
      validateFlagSets(log, methodName, maybeNameOrNames as string[], settings.sync.__splitFiltersValidation.groupedFilters.bySet) :
      startsWith(methodName, GET_TREATMENTS) ?
        validateSplits(log, maybeNameOrNames, methodName) :
        validateSplit(log, maybeNameOrNames, methodName);

    const attributes = validateAttributes(log, maybeAttributes, methodName);
    const isNotDestroyed = validateIfNotDestroyed(log, readinessManager, methodName);
    const options = validateEvaluationOptions(log, maybeOptions, methodName);

    validateIfReadyFromCache(log, readinessManager, methodName);

    const valid = isNotDestroyed && key && nameOrNames && attributes !== false;

    return {
      valid,
      key,
      nameOrNames,
      attributes,
      options
    };
  }

  function evaluateFallBackTreatment(featureFlagName: string | false | string[], withConfig: boolean) {
    if (Array.isArray(featureFlagName)) {
      const res: SplitIO.Treatments = {};
      featureFlagName.forEach((split: string) => res[split] = evaluateFallBackTreatment(split, withConfig) as SplitIO.Treatment);
      return res;
    }

    const { treatment, config } = fallbackTreatmentsCalculator(featureFlagName as string);

    return withConfig ?
      {
        treatment,
        config
      } : treatment;
  }

  function wrapResult<T>(value: T): MaybeThenable<T> {
    return isAsync ? Promise.resolve(value) : value;
  }

  function getTreatment(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENT, maybeKey, maybeFeatureFlagName, maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatment(params.key as SplitIO.SplitKey, params.nameOrNames as string, params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult(evaluateFallBackTreatment(params.nameOrNames, false));
  }

  function getTreatmentWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENT_WITH_CONFIG, maybeKey, maybeFeatureFlagName, maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatmentWithConfig(params.key as SplitIO.SplitKey, params.nameOrNames as string, params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult(evaluateFallBackTreatment(params.nameOrNames, true));
  }

  function getTreatments(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENTS, maybeKey, maybeFeatureFlagNames, maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatments(params.key as SplitIO.SplitKey, params.nameOrNames as string[], params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult(evaluateFallBackTreatment(params.nameOrNames || [], false));
  }

  function getTreatmentsWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENTS_WITH_CONFIG, maybeKey, maybeFeatureFlagNames, maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatmentsWithConfig(params.key as SplitIO.SplitKey, params.nameOrNames as string[], params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult(evaluateFallBackTreatment(params.nameOrNames || [], true));
  }

  function getTreatmentsByFlagSets(maybeKey: SplitIO.SplitKey, maybeFlagSets: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENTS_BY_FLAG_SETS, maybeKey, maybeFlagSets, maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatmentsByFlagSets(params.key as SplitIO.SplitKey, params.nameOrNames as string[], params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult({});
  }

  function getTreatmentsWithConfigByFlagSets(maybeKey: SplitIO.SplitKey, maybeFlagSets: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SETS, maybeKey, maybeFlagSets, maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatmentsWithConfigByFlagSets(params.key as SplitIO.SplitKey, params.nameOrNames as string[], params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult({});
  }

  function getTreatmentsByFlagSet(maybeKey: SplitIO.SplitKey, maybeFlagSet: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENTS_BY_FLAG_SET, maybeKey, [maybeFlagSet], maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatmentsByFlagSet(params.key as SplitIO.SplitKey, (params.nameOrNames as string[])[0], params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult({});
  }

  function getTreatmentsWithConfigByFlagSet(maybeKey: SplitIO.SplitKey, maybeFlagSet: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    const params = validateEvaluationParams(GET_TREATMENTS_WITH_CONFIG_BY_FLAG_SET, maybeKey, [maybeFlagSet], maybeAttributes, maybeOptions);

    return params.valid ?
      client.getTreatmentsWithConfigByFlagSet(params.key as SplitIO.SplitKey, (params.nameOrNames as string[])[0], params.attributes as SplitIO.Attributes | undefined, params.options) :
      wrapResult({});
  }

  function track(maybeKey: SplitIO.SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: SplitIO.Properties) {
    const key = validateKey(log, maybeKey, TRACK_FN_LABEL);
    const tt = validateTrafficType(log, maybeTT, TRACK_FN_LABEL);
    const event = validateEvent(log, maybeEvent, TRACK_FN_LABEL);
    const eventValue = validateEventValue(log, maybeEventValue, TRACK_FN_LABEL);
    const { properties, size } = validateEventProperties(log, maybeProperties, TRACK_FN_LABEL);
    const isNotDestroyed = validateIfNotDestroyed(log, readinessManager, TRACK_FN_LABEL);

    return isNotDestroyed && key && tt && event && eventValue !== false && properties !== false ? // @ts-expect-error
      client.track(key, tt, event, eventValue, properties, size) :
      wrapResult(false);
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
