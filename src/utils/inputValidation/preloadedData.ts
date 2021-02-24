import { isObject, isString, isFiniteNumber } from '../lang';
import { validateSplit } from './split';
import { logFactory } from '../../logger/sdkLogger';
import { SplitIO } from '../../types';
const log = logFactory('');

function validateTimestampData(maybeTimestamp: any, method: string, item: string) {
  if (isFiniteNumber(maybeTimestamp) && maybeTimestamp > -1) return true;
  log.e(`${method}: preloadedData.${item} must be a positive number.`);
  return false;
}

function validateSplitsData(maybeSplitsData: any, method: string) {
  if (isObject(maybeSplitsData)) {
    const splitNames = Object.keys(maybeSplitsData);
    if (splitNames.length === 0) log.w(`${method}: preloadedData.splitsData doesn't contain split definitions.`);
    // @TODO in the future, consider handling the possibility of having parsed definitions of splits
    if (splitNames.every(splitName => validateSplit(splitName, method) && isString(maybeSplitsData[splitName]))) return true;
  }
  log.e(`${method}: preloadedData.splitsData must be a map of split names to their serialized definitions.`);
  return false;
}

function validateMySegmentsData(maybeMySegmentsData: any, method: string) {
  if (isObject(maybeMySegmentsData)) {
    const userKeys = Object.keys(maybeMySegmentsData);
    if (userKeys.every(userKey => {
      const segmentNames = maybeMySegmentsData[userKey];
      // an empty list is valid
      return Array.isArray(segmentNames) && segmentNames.every(segmentName => isString(segmentName));
    })) return true;
  }
  log.e(`${method}: preloadedData.mySegmentsData must be a map of user keys to their list of segment names.`);
  return false;
}

function validateSegmentsData(maybeSegmentsData: any, method: string) {
  if (isObject(maybeSegmentsData)) {
    const segmentNames = Object.keys(maybeSegmentsData);
    if (segmentNames.every(segmentName => isString(maybeSegmentsData[segmentName]))) return true;
  }
  log.e(`${method}: preloadedData.segmentsData must be a map of segment names to their serialized definitions.`);
  return false;
}

export function validatePreloadedData(maybePreloadedData: any, method: string): maybePreloadedData is SplitIO.PreloadedData {
  if (!isObject(maybePreloadedData)) {
    log.e(`${method}: preloadedData must be an object.`);
  } else if (
    validateTimestampData(maybePreloadedData.lastUpdated, method, 'lastUpdated') &&
    validateTimestampData(maybePreloadedData.since, method, 'since') &&
    validateSplitsData(maybePreloadedData.splitsData, method) &&
    (!maybePreloadedData.mySegmentsData || validateMySegmentsData(maybePreloadedData.mySegmentsData, method)) &&
    (!maybePreloadedData.segmentsData || validateSegmentsData(maybePreloadedData.segmentsData, method))
  ) {
    return true;
  }
  return false;
}
