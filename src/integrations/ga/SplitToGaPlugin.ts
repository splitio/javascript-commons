import { IIntegrationFactoryParams } from '../types';
import SplitToGa from './SplitToGa';
import { SplitToGoogleAnalyticsOptions } from './types';

export default function SplitToGaPlugin(options: SplitToGoogleAnalyticsOptions = {}) {

  // SplitToGa integration factory
  return (params: IIntegrationFactoryParams) => {
    return new SplitToGa(options, params.settings.log);
  };
}
