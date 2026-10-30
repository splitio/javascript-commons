import { IDefinitionPartial } from './types';
import { IDefinitionChangesResponse } from '../../../dtos/types';
import SplitIO from '../../../../types/splitio';
import { isObject, forOwn } from '../../../utils/lang';
import { parseCondition } from './parseCondition';
import { definitionChangesBuilderFactory } from './definitionChangesBuilder';

export function splitsParserFromSettingsFactory() {

  const definitionChangesBuilder = definitionChangesBuilderFactory();

  /**
   *
   * @param settings - validated object with mocked features mapping.
   */
  return function splitsParserFromSettings(settings: Pick<SplitIO.ISettings, 'features'>): IDefinitionChangesResponse {
    const features = settings.features as SplitIO.MockedFeaturesMap || {};

    const mock: Record<string, IDefinitionPartial> = {};

    forOwn(features, (data, splitName) => {
      let treatment = data;
      let config = null;

      if (isObject(data)) {
        treatment = (data as SplitIO.TreatmentWithConfig).treatment;
        config = (data as SplitIO.TreatmentWithConfig).config || config;
      }
      const configurations: Record<string, string> = {};
      if (config !== null) configurations[treatment as string] = config;

      mock[splitName] = {
        trafficTypeName: 'localhost',
        conditions: [parseCondition({ treatment: treatment as string })],
        configurations
      };
    });

    return definitionChangesBuilder(mock);
  };

}
