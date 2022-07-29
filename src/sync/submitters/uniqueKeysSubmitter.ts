import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { ISet, setToArray } from '../../utils/lang/sets';
import { submitterFactory } from './submitter';
import { UniqueKeysPayload } from './types';

/**
 * Converts `uniqueKeys` data from cache into request payload.
 */
export function fromUniqueKeysCollector(uniqueKeys: { [featureName: string]: ISet<string> }): UniqueKeysPayload {
  const payload = [];
  const keys = Object.keys(uniqueKeys);
  for (let i = 0; i < keys.length; i++) {
    const featureName = keys[i];
    const featureKeys = setToArray(uniqueKeys[featureName]);
    const uniqueKeysPayload = {
      f: featureName,
      k: featureKeys
    };

    payload.push(uniqueKeysPayload);
  }
  return payload;
}

/**
 * Submitter that periodically posts impression counts
 */
export function uniqueKeysSubmitterFactory(params: ISdkFactoryContextSync) {

  const {
    settings: { log, scheduler: { uniqueKeysRefreshRate } },
    splitApi: { postUniqueKeysBulk },
    storage: { uniqueKeys }
  } = params;

  return submitterFactory(log, postUniqueKeysBulk, uniqueKeys!, uniqueKeysRefreshRate, 'unique keys', fromUniqueKeysCollector, 1);
}
