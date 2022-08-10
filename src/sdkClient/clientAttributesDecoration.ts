import { AttributesCacheInMemory } from '../storages/inMemory/AttributesCacheInMemory';
import { validateAttributesDeep } from '../utils/inputValidation/attributes';
import { Attributes, IAsyncClientSS, IClientSS, Properties, SplitKey } from '../types';
import { ILogger } from '../types';
import { objectAssign } from '../utils/lang/objectAssign';

/**
 * Add in memory attributes storage methods and combine them with any attribute received from the getTreatment/s call
 */
export function clientAttributesDecoration(log: ILogger, client: IClientSS | IAsyncClientSS) {

  const attributeStorage = new AttributesCacheInMemory();

  // Keep a reference to the original methods
  const clientGetTreatment = client.getTreatment;
  const clientGetTreatmentWithConfig = client.getTreatmentWithConfig;
  const clientGetTreatments = client.getTreatments;
  const clientGetTreatmentsWithConfig = client.getTreatmentsWithConfig;
  const clientTrack = client.track;

  function getTreatment(maybeKey: SplitKey, maybeSplit: string, maybeAttributes?: Attributes) {
    return clientGetTreatment(maybeKey, maybeSplit, combineAttributes(maybeAttributes));
  }

  function getTreatmentWithConfig(maybeKey: SplitKey, maybeSplit: string, maybeAttributes?: Attributes) {
    return clientGetTreatmentWithConfig(maybeKey, maybeSplit, combineAttributes(maybeAttributes));
  }

  function getTreatments(maybeKey: SplitKey, maybeSplits: string[], maybeAttributes?: Attributes) {
    return clientGetTreatments(maybeKey, maybeSplits, combineAttributes(maybeAttributes));
  }

  function getTreatmentsWithConfig(maybeKey: SplitKey, maybeSplits: string[], maybeAttributes?: Attributes) {
    return clientGetTreatmentsWithConfig(maybeKey, maybeSplits, combineAttributes(maybeAttributes));
  }

  function track(maybeKey: SplitKey, maybeTT: string, maybeEvent: string, maybeEventValue?: number, maybeProperties?: Properties) {
    return clientTrack(maybeKey, maybeTT, maybeEvent, maybeEventValue, maybeProperties);
  }

  function combineAttributes(maybeAttributes: Attributes | undefined): Attributes | undefined{
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
    setAttribute(attributeName: string, attributeValue: Object) {
      const attribute: Record<string, Object> = {};
      attribute[attributeName] = attributeValue;
      if (!validateAttributesDeep(log, attribute, 'setAttribute')) return false;
      log.debug(`stored ${attributeValue} for attribute ${attributeName}`);
      return attributeStorage.setAttribute(attributeName, attributeValue);
    },

    /**
     * Returns the attribute with the given key
     *
     * @param {string} attributeName Attribute name
     * @returns {Object} Attribute with the given key
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
    getAttributes(): Record<string, Object> {
      return attributeStorage.getAll();
    },

    /**
     * Removes from client's in memory attributes storage the attribute with the given key
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
