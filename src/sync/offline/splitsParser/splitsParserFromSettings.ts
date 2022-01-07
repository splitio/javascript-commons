import { ISplitPartial } from '../../../dtos/types';
import { ISettings, SplitIO } from '../../../types';
import { isObject, forOwn } from '../../../utils/lang';
import { parseCondition } from './parseCondition';

function hasTreatmentChanged(prev: string | SplitIO.TreatmentWithConfig, curr: string | SplitIO.TreatmentWithConfig) {
  if (typeof prev !== typeof curr) return true;

  if (typeof prev === 'string') { // strings treatments, just compare
    return prev !== curr;
  } else { // has treatment and config, compare both
    return prev.treatment !== (curr as SplitIO.TreatmentWithConfig).treatment || prev.config !== (curr as SplitIO.TreatmentWithConfig).config;
  }
}

export function splitsParserFromSettingsFactory() {

  let previousMock: SplitIO.MockedFeaturesMap = { 'emptyMock': '1' };

  function mockUpdated(currentData: SplitIO.MockedFeaturesMap) {
    const names = Object.keys(currentData);

    // Different amount of items
    if (names.length !== Object.keys(previousMock).length) {
      previousMock = currentData;
      return true;
    }

    return names.some(name => {
      const newSplit = !previousMock[name];
      const newTreatment = hasTreatmentChanged(previousMock[name], currentData[name]);
      const changed = newSplit || newTreatment;

      if (changed) previousMock = currentData;

      return changed;
    });
  }

  /**
   *
   * @param settings validated object with mocked features mapping.
   */
  return function splitsParserFromSettings(settings: ISettings): false | Record<string, ISplitPartial> {
    const features = settings.features as SplitIO.MockedFeaturesMap || {};

    if (!mockUpdated(features)) return false;

    const splitObjects: Record<string, ISplitPartial> = {};

    forOwn(features, (data, splitName) => {
      let treatment = data;
      let config = null;

      if (isObject(data)) {
        treatment = (data as SplitIO.TreatmentWithConfig).treatment;
        config = (data as SplitIO.TreatmentWithConfig).config || config;
      }
      const configurations: Record<string, string> = {};
      if (config !== null) configurations[treatment as string] = config;

      splitObjects[splitName] = {
        trafficTypeName: 'localhost',
        conditions: [parseCondition({ treatment: treatment as string })],
        configurations
      };
    });

    return splitObjects;
  };

}
