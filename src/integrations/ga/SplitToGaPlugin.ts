import SplitToGa from './SplitToGa';
import { SplitToGoogleAnalyticsOptions } from './types';

export default function SplitToGaPlugin(options: SplitToGoogleAnalyticsOptions) {

  // SplitToGa integration factory
  return () => {
    return new SplitToGa(options);
  };
}
