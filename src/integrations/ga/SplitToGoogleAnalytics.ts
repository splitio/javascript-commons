import { IIntegrationFactoryParams } from '../types';
import { SplitToGa } from './SplitToGa';
import { SplitToGoogleAnalyticsOptions } from './types';

export function SplitToGoogleAnalytics(options: SplitToGoogleAnalyticsOptions = {}) {

  // SplitToGa integration factory
  return (params: IIntegrationFactoryParams) => {
    return new SplitToGa(params.settings.log, options);
  };
}
