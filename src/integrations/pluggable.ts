import { SPLIT_IMPRESSION, SPLIT_EVENT } from '../utils/constants';
import { SplitIO } from '../types';
import { IIntegration, IIntegrationManager, IIntegrationFactoryParams } from './types';

/**
 * Factory function for IntegrationsManager with pluggable integrations.
 * The integrations manager instantiates integration, and bypass tracked events and impressions to them.
 *
 * @param integrations validated list of integration factories
 * @param params information of the Sdk factory instance that integrations can access to
 *
 * @returns integration manager or undefined if `integrations` are not present in settings.
 */
export function pluggableIntegrationsManagerFactory(
  integrations: Array<(params: IIntegrationFactoryParams) => IIntegration | void>,
  params: IIntegrationFactoryParams
): IIntegrationManager | undefined {

  const listeners: IIntegration[] = [];

  // No need to check if `settings.integrations` is an array of functions. It was already validated
  integrations.forEach(integrationFactory => {
    let integration = integrationFactory(params);
    if (integration && integration.queue) listeners.push(integration);
  });

  // If `listeners` is empty, not return a integration manager
  if (listeners.length === 0) return;

  // Exception safe methods: each integration module is responsable for handling errors
  return {
    handleImpression(impressionData: SplitIO.ImpressionData) {
      listeners.forEach(listener => listener.queue({ type: SPLIT_IMPRESSION, payload: impressionData }));
    },
    handleEvent(eventData: SplitIO.EventData) {
      listeners.forEach(listener => listener.queue({ type: SPLIT_EVENT, payload: eventData }));
    }
  };
}
