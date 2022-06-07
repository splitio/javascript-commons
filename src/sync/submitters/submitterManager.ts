import { eventsSubmitterFactory } from './eventsSubmitter';
import { impressionsSubmitterFactory } from './impressionsSubmitter';
import { impressionCountsSubmitterFactory } from './impressionCountsSubmitter';
import { telemetrySubmitterFactory } from './telemetrySubmitter';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';

export function submitterManagerFactory(params: ISdkFactoryContextSync) {

  const submitters = [
    impressionsSubmitterFactory(params),
    eventsSubmitterFactory(params)
  ];

  const impressionCountsSubmitter = impressionCountsSubmitterFactory(params);
  if (impressionCountsSubmitter) submitters.push(impressionCountsSubmitter);
  const telemetrySubmitter = telemetrySubmitterFactory(params);
  if (telemetrySubmitter) submitters.push(telemetrySubmitter);


  return {
    start() {
      submitters.forEach(submitter => submitter.start());
    },
    stop() {
      submitters.forEach(submitter => submitter.stop());
    },
    isRunning() {
      return submitters.some(submitter => submitter.isRunning());
    },
    execute() {
      return Promise.all(submitters.map(submitter => submitter.execute()));
    },
    isExecuting() {
      return submitters.some(submitter => submitter.isExecuting());
    }
  };
}
