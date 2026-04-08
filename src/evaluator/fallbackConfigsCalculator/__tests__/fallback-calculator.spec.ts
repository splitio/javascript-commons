import { FallbackConfigsCalculator } from '../';
import SplitIO from '../../../../types/splitio';
import { CONTROL } from '../../../utils/constants';

describe('FallbackConfigsCalculator', () => {
  test('returns specific fallback if config name exists', () => {
    const fallbacks: SplitIO.FallbackConfigs = {
      byName: {
        'configA': { variant: 'VARIANT_A', value: { key: 1 } },
      },
    };
    const calculator = FallbackConfigsCalculator(fallbacks);
    const result = calculator('configA', 'label by name');

    expect(result).toEqual({
      treatment: 'VARIANT_A',
      config: { key: 1 },
      label: 'fallback - label by name',
    });
  });

  test('returns global fallback if config name is missing and global exists', () => {
    const fallbacks: SplitIO.FallbackConfigs = {
      byName: {},
      global: { variant: 'GLOBAL_VARIANT', value: { global: true } },
    };
    const calculator = FallbackConfigsCalculator(fallbacks);
    const result = calculator('missingConfig', 'label by global');

    expect(result).toEqual({
      treatment: 'GLOBAL_VARIANT',
      config: { global: true },
      label: 'fallback - label by global',
    });
  });

  test('returns control fallback if config name and global are missing', () => {
    const fallbacks: SplitIO.FallbackConfigs = {
      byName: {},
    };
    const calculator = FallbackConfigsCalculator(fallbacks);
    const result = calculator('missingConfig', 'label by noFallback');

    expect(result).toEqual({
      treatment: CONTROL,
      config: null,
      label: 'label by noFallback',
    });
  });
});
