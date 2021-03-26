import { validateIntegrations } from './common';
import { isString } from '../../lang';
import { ILogger } from '../../../logger/types';

/**
 * This function validates `settings.integrations` object that consists of a list of configuration items, used by the isomorphic JS SDK.
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 * @param {Array<string>} validIntegrationTypes list of integration types to filter from `settings.integrations`
 *
 * @returns {Array} array of valid integration items. The array might be empty if `settings` object does not have valid integrations.
 */
export function validateConfigurableIntegrations(settings: { log: ILogger, integrations?: any }, validIntegrationTypes: string[] = []) {

  return validateIntegrations(
    settings,
    integration => integration && isString(integration.type) && validIntegrationTypes.indexOf(integration.type) > -1,
    'Integration items must have a valid "type" value'
  );
}
