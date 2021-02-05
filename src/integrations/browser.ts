import { GOOGLE_ANALYTICS_TO_SPLIT, SPLIT_TO_GOOGLE_ANALYTICS } from '../utils/constants/browser';
import { IIntegration, IIntegrationManager, IIntegrationFactoryParams } from './types';
import { BrowserIntegration } from './ga/types';
import pluggableIntegrationsManagerFactory from './pluggable';
import GaToSplitPlugin from './ga/GaToSplitPlugin';
import SplitToGaPlugin from './ga/SplitToGaPlugin';

/**
 * IntegrationsManager factory for the browser variant of the isomorphic JS SDK.
 * The integrations manager instantiates integration modules, and bypass tracked events and impressions to them.
 *
 * @param integrations valid integration settings object for browser sdk
 * @param params information of the Sdk factory instance that integrations can access to
 *
 * @returns integration manager or undefined if `integrations` are not present in settings.
 */
export default function integrationsManagerFactory(
  integrations: BrowserIntegration[],
  params: IIntegrationFactoryParams
): IIntegrationManager | undefined {

  // maps integration config items into integration factories to reuse the pluggable integration manager
  const integrationFactories: Array<(params: IIntegrationFactoryParams) => IIntegration | void> = integrations
    .map(integrationOptions => {
      switch (integrationOptions.type) {
        case GOOGLE_ANALYTICS_TO_SPLIT: return GaToSplitPlugin(integrationOptions);
        case SPLIT_TO_GOOGLE_ANALYTICS: return SplitToGaPlugin(integrationOptions);
      }
    })
    .filter(integrationFactory => {
      return integrationFactory && typeof integrationFactory === 'function';
    });

  return pluggableIntegrationsManagerFactory(integrationFactories, params);
}
