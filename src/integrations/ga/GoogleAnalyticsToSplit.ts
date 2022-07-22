import { IIntegrationFactoryParams, IntegrationFactory } from '../types';
import { GaToSplit } from './GaToSplit';
import { GoogleAnalyticsToSplitOptions } from './types';

export function GoogleAnalyticsToSplit(options: GoogleAnalyticsToSplitOptions = {}): IntegrationFactory {

  // GaToSplit integration factory
  function GoogleAnalyticsToSplitFactory(params: IIntegrationFactoryParams) {
    return GaToSplit(options, params);
  }

  GoogleAnalyticsToSplitFactory.type = 'GOOGLE_ANALYTICS_TO_SPLIT';
  return GoogleAnalyticsToSplitFactory;
}
