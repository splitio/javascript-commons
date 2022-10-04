import { CONSUMER_MODE, CONSUMER_PARTIAL_MODE } from '../../utils/constants';
import { ISettings } from '../../types';

/**
 * Storage is async if mode is consumer or partial consumer
 */
export function isStorageSync(settings: ISettings) {
  return [CONSUMER_MODE, CONSUMER_PARTIAL_MODE].indexOf(settings.mode) === -1 ? true : false;
}
