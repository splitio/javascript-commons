import { IIntegrationFactoryParams, IntegrationFactory } from '../types';
import { SplitToGa } from './SplitToGa';
import { SplitToGoogleAnalyticsOptions } from './types';

export function SplitToGoogleAnalytics(options: SplitToGoogleAnalyticsOptions = {}): IntegrationFactory {

  // SplitToGa integration factory
  function SplitToGoogleAnalyticsFactory(params: IIntegrationFactoryParams) {
    return new SplitToGa(params.settings.log, options);
  }

  SplitToGoogleAnalyticsFactory.type = 'SPLIT_TO_GOOGLE_ANALYTICS';
  return SplitToGoogleAnalyticsFactory;
}
