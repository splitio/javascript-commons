import { eventsSubmitterFactory } from './eventsSubmitter';
import { impressionsSubmitterFactory } from './impressionsSubmitter';
import { impressionCountsSubmitterFactory } from './impressionCountsSubmitter';
import { telemetrySubmitterFactory } from './telemetrySubmitter';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { ISubmitterManager } from './types';

export function submitterManagerFactory(params: ISdkFactoryContextSync): ISubmitterManager {

  const submitters = [
    impressionsSubmitterFactory(params),
    eventsSubmitterFactory(params)
  ];

  const impressionCountsSubmitter = impressionCountsSubmitterFactory(params);
  if (impressionCountsSubmitter) submitters.push(impressionCountsSubmitter);
  const telemetrySubmitter = telemetrySubmitterFactory(params);

  return {
    start(onlyTelemetry?: boolean) {
      if (!onlyTelemetry) submitters.forEach(submitter => submitter.start());
      if (telemetrySubmitter) telemetrySubmitter.start();
    },
    stop(allExceptTelemetry?: boolean) {
      submitters.forEach(submitter => submitter.stop());
      if (!allExceptTelemetry && telemetrySubmitter) telemetrySubmitter.stop();
    },
    isRunning() {
      return submitters.some(submitter => submitter.isRunning());
    },
    execute(onlyTelemetry?: boolean) {
      const promises = onlyTelemetry ? [] : submitters.map(submitter => submitter.execute());
      if (telemetrySubmitter) promises.push(telemetrySubmitter.execute());
      return Promise.all(promises);
    },
    isExecuting() {
      return submitters.some(submitter => submitter.isExecuting());
    }
  };
}
