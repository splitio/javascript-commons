import { ISettings } from '../../../types';
import { validateIntegrations } from './common';
import { ILogger } from '../../../logger/types';

/**
 * This function validates `settings.integrations` object that consists of a list of pluggable integration factories.
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 *
 * @returns {Array} array of valid integration factories. The array might be empty if `settings` object does not have valid integrations.
 */
export function validatePluggableIntegrations(settings: { log: ILogger, integrations?: any }): ISettings['integrations'] {

  return validateIntegrations(
    settings,
    integration => typeof integration === 'function',
    'Integration items must be functions that initialize the integrations'
  );
}
