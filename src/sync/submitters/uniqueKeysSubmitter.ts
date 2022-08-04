import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { ISet, setToArray } from '../../utils/lang/sets';
import { submitterFactory } from './submitter';
import { UniqueKeysPayloadCs, UniqueKeysPayloadSs } from './types';

/**
 * Converts `uniqueKeys` data from cache into request payload for CS.
 */
export function fromUniqueKeysCollectorCs(uniqueKeys: { [featureName: string]: ISet<string> }): UniqueKeysPayloadCs {
  const payload = [];
  const featureKeys = Object.keys(uniqueKeys);
  for (let k = 0; k < featureKeys.length; k++) {
    const featureKey = featureKeys[k];
    const featureNames = setToArray(uniqueKeys[featureKey]);
    const uniqueKeysPayload = {
      k: featureKey,
      fs: featureNames
    };

    payload.push(uniqueKeysPayload);
  }
  return { keys: payload };
}

/**
 * Converts `uniqueKeys` data from cache into request payload for SS.
 */
export function fromUniqueKeysCollectorSs(uniqueKeys: { [featureName: string]: ISet<string> }): UniqueKeysPayloadSs {
  const payload = [];
  const featureNames = Object.keys(uniqueKeys);
  for (let i = 0; i < featureNames.length; i++) {
    const featureName = featureNames[i];
    const featureKeys = setToArray(uniqueKeys[featureName]);
    const uniqueKeysPayload = {
      f: featureName,
      ks: featureKeys
    };

    payload.push(uniqueKeysPayload);
  }
  return { keys: payload };
}

/**
 * Submitter that periodically posts impression counts
 */
export function uniqueKeysSubmitterFactory(params: ISdkFactoryContextSync) {

  const {
    settings: { log, scheduler: { uniqueKeysRefreshRate }, core: {key}},
    splitApi: { postUniqueKeysBulkCs, postUniqueKeysBulkSs },
    storage: { uniqueKeys }
  } = params;
  
  const isClientSide = key !== undefined;
  const postUniqueKeysBulk = isClientSide ? postUniqueKeysBulkCs : postUniqueKeysBulkSs;
  const fromUniqueKeysCollector = isClientSide ? fromUniqueKeysCollectorCs : fromUniqueKeysCollectorSs;

  return submitterFactory(log, postUniqueKeysBulk, uniqueKeys!, uniqueKeysRefreshRate, 'unique keys', fromUniqueKeysCollector);
}

