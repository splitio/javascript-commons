import { syncTaskComposite } from '../syncTaskComposite';
import { eventsSubmitterFactory } from './eventsSubmitter';
import { impressionsSubmitterFactory } from './impressionsSubmitter';
import { impressionCountsSubmitterFactory } from './impressionCountsSubmitter';
import { telemetrySubmitterFactory } from './telemetrySubmitter';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';

export function submitterManagerFactory(params: ISdkFactoryContextSync) {

  const submitters = [
    impressionsSubmitterFactory(params),
    eventsSubmitterFactory(params),
    telemetrySubmitterFactory(params)
  ];

  const impressionCountsSubmitter = impressionCountsSubmitterFactory(params);
  if (impressionCountsSubmitter) submitters.push(impressionCountsSubmitter);

  return syncTaskComposite(submitters);
}
