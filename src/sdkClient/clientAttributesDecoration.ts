import { AttributesCacheInMemory } from '../storages/inMemory/AttributesCacheInMemory';
import { validateAttributesDeep } from '../utils/inputValidation/attributes';
import { SplitIO } from '../types';
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
  const clientTrack = client.track;

  function getTreatment(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes) {
    return clientGetTreatment(maybeKey, maybeFeatureFlagName, combineAttributes(maybeAttributes));
  }

  function getTreatmentWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagName: string, maybeAttributes?: SplitIO.Attributes) {
    return clientGetTreatmentWithConfig(maybeKey, maybeFeatureFlagName, combineAttributes(maybeAttributes));
  }

  function getTreatments(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes) {
    return clientGetTreatments(maybeKey, maybeFeatureFlagNames, combineAttributes(maybeAttributes));
  }

  function getTreatmentsWithConfig(maybeKey: SplitIO.SplitKey, maybeFeatureFlagNames: string[], maybeAttributes?: SplitIO.Attributes) {
    return clientGetTreatmentsWithConfig(maybeKey, maybeFeatureFlagNames, combineAttributes(maybeAttributes));
  }

  function track(maybeKey: SplitIO.SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: SplitIO.Properties) {
    return clientTrack(maybeKey, maybeTT, maybeEvent, maybeEventValue, maybeProperties);
  }

  function combineAttributes(maybeAttributes: SplitIO.Attributes | undefined): SplitIO.Attributes | undefined{
    const storedAttributes = attributeStorage.getAll();
    if (Object.keys(storedAttributes).length > 0) {
      return objectAssign({}, storedAttributes, maybeAttributes);
    }
    return maybeAttributes;
  }

  return objectAssign(client, {
    getTreatment: getTreatment,
    getTreatmentWithConfig: getTreatmentWithConfig,
    getTreatments: getTreatments,
    getTreatmentsWithConfig: getTreatmentsWithConfig,
    track: track,

    /**
     * Add an attribute to client's in memory attributes storage
     *
     * @param {string} attributeName Attrinute name
     * @param {string, number, boolean, list} attributeValue Attribute value
     * @returns {boolean} true if the attribute was stored and false otherways
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
     * @param {string} attributeName Attribute name
     * @returns {Object} Attribute with the given name
     */
    getAttribute(attributeName: string) {
      log.debug(`retrieved attribute ${attributeName}`);
      return attributeStorage.getAttribute(attributeName + '');
    },

    /**
     * Add to client's in memory attributes storage the attributes in 'attributes'
     *
     * @param {Object} attributes Object with attributes to store
     * @returns true if attributes were stored an false otherways
     */
    setAttributes(attributes: Record<string, Object>) {
      if (!validateAttributesDeep(log, attributes, 'setAttributes')) return false;
      return attributeStorage.setAttributes(attributes);
    },

    /**
     * Return all the attributes stored in client's in memory attributes storage
     *
     * @returns {Object} returns all the stored attributes
     */
    getAttributes() {
      return attributeStorage.getAll();
    },

    /**
     * Removes from client's in memory attributes storage the attribute with the given name
     *
     * @param {string} attributeName
     * @returns {boolean} true if attribute was removed and false otherways
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
