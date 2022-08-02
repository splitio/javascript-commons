import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { ISet, setToArray } from '../../utils/lang/sets';
import { submitterFactory } from './submitter';
import { UniqueKeysPayloadCs, UniqueKeysPayloadSs } from './types';

/** 
 * Invert keys for feature to features for key
 */
function invertUniqueKeys(uniqueKeys: { [featureName: string]: ISet<string> }): { [key: string]: string[] } {
  const featureNames = Object.keys(uniqueKeys);
  const inverted: { [key: string]: string[] } = {};
  for (let i = 0; i < featureNames.length; i++) {
    const featureName = featureNames[i];
    const featureKeys = setToArray(uniqueKeys[featureName]);
    for (let j = 0; j< featureKeys.length; j++) {
      const featureKey = featureKeys[j];
      if (!inverted[featureKey]) inverted[featureKey] = []; 
      inverted[featureKey].push(featureName);
    }
  }
  return inverted;
}

/**
 * Converts `uniqueKeys` data from cache into request payload for CS.
 */
export function fromUniqueKeysCollectorCs(uniqueKeys: { [featureName: string]: ISet<string> }): UniqueKeysPayloadCs {
  const payload = [];
  const featuresPerKey = invertUniqueKeys(uniqueKeys);
  const keys = Object.keys(featuresPerKey);
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k];
    const uniqueKeysPayload = {
      k: key,
      fs: featuresPerKey[key]
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

