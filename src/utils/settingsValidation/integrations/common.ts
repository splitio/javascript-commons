import { WARN_INTEGRATION_INVALID } from '../../../logger/constants';
import { ILogger } from '../../../logger/types';

/**
 * This function validates `settings.integrations` object
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 * @param {function} integrationValidator filter used to remove invalid integration items
 * @param {string} extraWarning optional string used to better describe why an item might be invalid
 *
 * @returns {Array} array of valid integration items. The array might be empty if `settings` object does not have valid integrations.
 */
export function validateIntegrations(settings: { log: ILogger, integrations?: any }, integrationValidator: (integrationItem: any) => boolean, extraWarning?: string) {
  const { integrations, log } = settings;

  // If integrations is not an array or an empty array, we return an empty array (no integrations).
  if (!Array.isArray(integrations) || integrations.length === 0) return [];

  // We remove invalid integration items
  const validIntegrations = integrations.filter(integrationValidator);

  // Log a warning if at least one item is invalid
  const invalids = integrations.length - validIntegrations.length;
  if (invalids) log.warn(WARN_INTEGRATION_INVALID, [invalids, extraWarning || '']);

  return validIntegrations;
}
