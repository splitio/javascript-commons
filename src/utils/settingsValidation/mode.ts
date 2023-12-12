import { LOCALHOST_MODE, STANDALONE_MODE, PRODUCER_MODE, CONSUMER_MODE, CONSUMER_PARTIAL_MODE } from '../constants';

export function validateMode(key: string, mode: string) {
  // Leaving the comparison as is, in case we change the mode name but not the setting.
  if (key === 'localhost') return LOCALHOST_MODE;

  if ([STANDALONE_MODE, PRODUCER_MODE, CONSUMER_MODE, CONSUMER_PARTIAL_MODE].indexOf(mode) === -1) throw Error('Invalid mode provided');

  return mode;
}

/**
 * Storage is async if mode is consumer or partial consumer
 */
export function isConsumerMode(mode: string) {
  return CONSUMER_MODE === mode || CONSUMER_PARTIAL_MODE === mode;
}
