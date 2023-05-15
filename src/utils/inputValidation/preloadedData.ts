import { isObject, isString, isFiniteNumber } from '../lang';
import { validateSplit } from './split';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';

function validateTimestampData(log: ILogger, maybeTimestamp: any, method: string, item: string) {
  if (isFiniteNumber(maybeTimestamp) && maybeTimestamp > -1) return true;
  log.error(`${method}: preloadedData.${item} must be a positive number.`);
  return false;
}

function validateSplitsData(log: ILogger, maybeSplitsData: any, method: string) {
  if (isObject(maybeSplitsData)) {
    const splitNames = Object.keys(maybeSplitsData);
    if (splitNames.length === 0) log.warn(`${method}: preloadedData.splitsData doesn't contain feature flag definitions.`);
    // @TODO in the future, consider handling the possibility of having parsed definitions of splits
    if (splitNames.every(splitName => validateSplit(log, splitName, method) && isString(maybeSplitsData[splitName]))) return true;
  }
  log.error(`${method}: preloadedData.splitsData must be a map of feature flag names to their stringified definitions.`);
  return false;
}

function validateMySegmentsData(log: ILogger, maybeMySegmentsData: any, method: string) {
  if (isObject(maybeMySegmentsData)) {
    const userKeys = Object.keys(maybeMySegmentsData);
    if (userKeys.every(userKey => {
      const segmentNames = maybeMySegmentsData[userKey];
      // an empty list is valid
      return Array.isArray(segmentNames) && segmentNames.every(segmentName => isString(segmentName));
    })) return true;
  }
  log.error(`${method}: preloadedData.mySegmentsData must be a map of user keys to their list of segment names.`);
  return false;
}

function validateSegmentsData(log: ILogger, maybeSegmentsData: any, method: string) {
  if (isObject(maybeSegmentsData)) {
    const segmentNames = Object.keys(maybeSegmentsData);
    if (segmentNames.every(segmentName => isString(maybeSegmentsData[segmentName]))) return true;
  }
  log.error(`${method}: preloadedData.segmentsData must be a map of segment names to their stringified definitions.`);
  return false;
}

export function validatePreloadedData(log: ILogger, maybePreloadedData: any, method: string): maybePreloadedData is SplitIO.PreloadedData {
  if (!isObject(maybePreloadedData)) {
    log.error(`${method}: preloadedData must be an object.`);
  } else if (
    validateTimestampData(log, maybePreloadedData.lastUpdated, method, 'lastUpdated') &&
    validateTimestampData(log, maybePreloadedData.since, method, 'since') &&
    validateSplitsData(log, maybePreloadedData.splitsData, method) &&
    (!maybePreloadedData.mySegmentsData || validateMySegmentsData(log, maybePreloadedData.mySegmentsData, method)) &&
    (!maybePreloadedData.segmentsData || validateSegmentsData(log, maybePreloadedData.segmentsData, method))
  ) {
    return true;
  }
  return false;
}
