import { AttributesCacheInMemory } from '../storages/inMemory/AttributesCacheInMemory';
import { validateAttributesDeep } from '../utils/inputValidation/attributes';
import SplitIO from '../../types/splitio';
import { ILogger } from '../logger/types';
import { objectAssign } from '../utils/lang/objectAssign';

/**
 * Add in memory attributes storage methods and combine them with any attribute received from the getTreatment/s call
 */
export function clientAttributesDecoration<TClient extends SplitIO.IClient | SplitIO.IAsyncClient>(log: ILogger, client: TClient) {

  const attributeStorage = new AttributesCacheInMemory();

  // Keep a reference to the original methods
  const clientGetTreatment = client.getTreatment;
  const clientGetTreatmentWithConfig = client.getTreatmentWithConfig;
  const clientGetTreatments = client.getTreatments;
  const clientGetTreatmentsWithConfig = client.getTreatmentsWithConfig;
  const clientGetTreatmentsByFlagSets = client.getTreatmentsByFlagSets;
  const clientGetTreatmentsWithConfigByFlagSets = client.getTreatmentsWithConfigByFlagSets;
  const clientGetTreatmentsByFlagSet = client.getTreatmentsByFlagSet;
  const clientGetTreatmentsWithConfigByFlagSet = client.getTreatmentsWithConfigByFlagSet;

  function getTreatment(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatment(maybeKey, maybeFeatureFlagName, combineAttributes(maybeAttributes), maybeOptions);
  }

  function getTreatmentWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatmentWithConfig(maybeKey, maybeFeatureFlagName, combineAttributes(maybeAttributes), maybeOptions);
  }

  function getTreatments(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatments(maybeKey, maybeFeatureFlagNames, combineAttributes(maybeAttributes), maybeOptions);
  }

  function getTreatmentsWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatmentsWithConfig(maybeKey, maybeFeatureFlagNames, combineAttributes(maybeAttributes), maybeOptions);
  }

  function getTreatmentsByFlagSets(maybeKey: SplitIO.SplitKey, maybeFlagSets: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatmentsByFlagSets(maybeKey, maybeFlagSets, combineAttributes(maybeAttributes), maybeOptions);
  }

  function getTreatmentsWithConfigByFlagSets(maybeKey: SplitIO.SplitKey, maybeFlagSets: string[], maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatmentsWithConfigByFlagSets(maybeKey, maybeFlagSets, combineAttributes(maybeAttributes), maybeOptions);
  }

  function getTreatmentsByFlagSet(maybeKey: SplitIO.SplitKey, maybeFlagSet: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatmentsByFlagSet(maybeKey, maybeFlagSet, combineAttributes(maybeAttributes), maybeOptions);
  }

  function getTreatmentsWithConfigByFlagSet(maybeKey: SplitIO.SplitKey, maybeFlagSet: string, maybeAttributes?: SplitIO.Attributes, maybeOptions?: SplitIO.EvaluationOptions) {
    return clientGetTreatmentsWithConfigByFlagSet(maybeKey, maybeFlagSet, combineAttributes(maybeAttributes), maybeOptions);
  }

  function combineAttributes(maybeAttributes: SplitIO.Attributes | undefined): SplitIO.Attributes | undefined {
    const storedAttributes = attributeStorage.getAll();
    return Object.keys(storedAttributes).length > 0 ?
      objectAssign({}, storedAttributes, maybeAttributes) :
      maybeAttributes;
  }

  return objectAssign(client, {
    getTreatment: getTreatment,
    getTreatmentWithConfig: getTreatmentWithConfig,
    getTreatments: getTreatments,
    getTreatmentsWithConfig: getTreatmentsWithConfig,
    getTreatmentsByFlagSets: getTreatmentsByFlagSets,
    getTreatmentsWithConfigByFlagSets: getTreatmentsWithConfigByFlagSets,
    getTreatmentsByFlagSet: getTreatmentsByFlagSet,
    getTreatmentsWithConfigByFlagSet: getTreatmentsWithConfigByFlagSet,

    /**
     * Add an attribute to client's in memory attributes storage
     *
     * @param attributeName - Attribute name
     * @param attributeValue - Attribute value
     * @returns true if the attribute was stored and false otherways
     */
    setAttribute(attributeName: string, attributeValue: SplitIO.AttributeType) {
      const attribute: Record<string, Object> = {};
      attribute[attributeName] = attributeValue;
      if (!validateAttributesDeep(log, attribute, 'setAttribute')) return false;
      log.debug(`stored ${attributeValue} for attribute ${attributeName}`);
      return attributeStorage.setAttribute(attributeName, attributeValue);
    },

    /**
     * Returns the attribute with the given name
     *
     * @param attributeName - Attribute name
     * @returns Attribute with the given name
     */
    getAttribute(attributeName: string) {
      log.debug(`retrieved attribute ${attributeName}`);
      return attributeStorage.getAttribute(attributeName + '');
    },

    /**
     * Add to client's in memory attributes storage the attributes in 'attributes'
     *
     * @param attributes - Object with attributes to store
     * @returns true if attributes were stored an false otherways
     */
    setAttributes(attributes: Record<string, Object>) {
      if (!validateAttributesDeep(log, attributes, 'setAttributes')) return false;
      return attributeStorage.setAttributes(attributes);
    },

    /**
     * Return all the attributes stored in client's in memory attributes storage
     *
     * @returns returns all the stored attributes
     */
    getAttributes() {
      return attributeStorage.getAll();
    },

    /**
     * Removes from client's in memory attributes storage the attribute with the given name
     *
     * @param attributeName - Attribute name
     * @returns true if attribute was removed and false otherways
     */
    removeAttribute(attributeName: string) {
      log.debug(`removed attribute ${attributeName}`);
      return attributeStorage.removeAttribute(attributeName + '');
    },

    /**
     * Remove all the stored attributes in the client's in memory attribute storage
     */
    clearAttributes() {
      return attributeStorage.clear();
    }

  });

}
