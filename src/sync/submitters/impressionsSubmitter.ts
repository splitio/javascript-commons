import { groupBy, forOwn } from '../../utils/lang';
import { ImpressionDTO } from '../../types';
import { submitterFactory } from './submitter';
import { ImpressionsPayload } from './types';
import { SUBMITTERS_PUSH_FULL_QUEUE } from '../../logger/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';

const DATA_NAME = 'impressions';

/**
 * Converts `impressions` data from cache into request payload.
 */
export function fromImpressionsCollector(sendLabels: boolean, data: ImpressionDTO[]): ImpressionsPayload {
  let groupedByFeature = groupBy(data, 'feature');
  let dto: ImpressionsPayload = [];

  // using forOwn instead of for...in since the last also iterates over prototype enumerables
  forOwn(groupedByFeature, (value, name) => {
    dto.push({
      f: name, // Test Name
      i: value.map(entry => { // Key Impressions
        const keyImpression = {
          k: entry.keyName, // Key
          t: entry.treatment, // Treatment
          m: entry.time, // Timestamp
          c: entry.changeNumber, // ChangeNumber
          r: sendLabels ? entry.label : undefined, // Rule
          b: entry.bucketingKey ? entry.bucketingKey : undefined, // Bucketing Key
          pt: entry.pt ? entry.pt : undefined // Previous time
        };

        return keyImpression;
      })
    });
  });

  return dto;
}

/**
 * Submitter that periodically posts impressions data
 */
export function impressionsSubmitterFactory(params: ISdkFactoryContextSync) {

  const {
    settings: { log, scheduler: { impressionsRefreshRate }, core: { labelsEnabled } },
    splitApi: { postTestImpressionsBulk },
    storage: { impressions }
  } = params;

  // retry impressions only once.
  const syncTask = submitterFactory(log, postTestImpressionsBulk, impressions, impressionsRefreshRate, DATA_NAME, fromImpressionsCollector.bind(undefined, labelsEnabled), 1);

  // register impressions submitter to be executed when impressions cache is full
  impressions.setOnFullQueueCb(() => {
    if (syncTask.isRunning()) {
      log.info(SUBMITTERS_PUSH_FULL_QUEUE, [DATA_NAME]);
      syncTask.execute();
    }
    // If submitter is stopped (e.g., user consent declined or unknown, or app state offline), we don't send the data.
    // Data will be sent when submitter is resumed.
  });

  return syncTask;
}
