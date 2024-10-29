import SplitIO from '../../../types/splitio';
import { objectAssign } from '../../utils/lang/objectAssign';

export class AttributesCacheInMemory {

  private attributesCache: Record<string, SplitIO.AttributeType> = {};


  /**
   * Create or update the value for the given attribute
   *
   * @param attributeName - attribute name
   * @param attributeValue - attribute value
   * @returns the attribute was stored
   */
  setAttribute(attributeName: string, attributeValue: SplitIO.AttributeType) {
    this.attributesCache[attributeName] = attributeValue;
    return true;
  }

  /**
   * Retrieves the value of a given attribute
   *
   * @param attributeName - attribute name
   * @returns stored attribute value
   */
  getAttribute(attributeName: string) {
    return this.attributesCache[attributeName];
  }

  /**
   * Create or update all the given attributes
   *
   * @param attributes - attributes to create or update
   * @returns attributes were stored
   */
  setAttributes(attributes: Record<string, Object>) {
    this.attributesCache = objectAssign(this.attributesCache, attributes);
    return true;
  }

  /**
   * Retrieve the full attributes map
   *
   * @returns stored attributes
   */
  getAll() {
    return this.attributesCache;
  }

  /**
   * Removes a given attribute from the map
   *
   * @param attributeName - attribute to remove
   * @returns attribute removed
   */
  removeAttribute(attributeName: string) {
    if (Object.keys(this.attributesCache).indexOf(attributeName) >= 0) {
      delete this.attributesCache[attributeName];
      return true;
    }
    return false;
  }

  /**
   * Clears all attributes stored in the SDK
   *
   */
  clear() {
    this.attributesCache = {};
    return true;
  }

}
