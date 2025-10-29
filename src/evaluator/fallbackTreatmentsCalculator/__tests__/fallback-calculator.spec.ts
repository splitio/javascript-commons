import { FallbackTreatmentsCalculator } from '../';
import type { FallbackTreatmentConfiguration } from '../../../../types/splitio';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { CONTROL } from '../../../utils/constants';

describe('FallbackTreatmentsCalculator' , () => {
  const longName = 'a'.repeat(101);

  test('returns specific fallback if flag exists', () => {
    const config: FallbackTreatmentConfiguration = {
      byFlag: {
        'featureA': { treatment: 'TREATMENT_A', config: '{ value: 1 }' },
      },
    };
    const calculator = new FallbackTreatmentsCalculator(config);
    const result = calculator.resolve('featureA', 'label by flag');

    expect(result).toEqual({
      treatment: 'TREATMENT_A',
      config: '{ value: 1 }',
      label: 'fallback - label by flag',
    });
  });

  test('returns global fallback if flag is missing and global exists', () => {
    const config: FallbackTreatmentConfiguration = {
      byFlag: {},
      global: { treatment: 'GLOBAL_TREATMENT', config: '{ global: true }' },
    };
    const calculator = new FallbackTreatmentsCalculator(config);
    const result = calculator.resolve('missingFlag', 'label by global');

    expect(result).toEqual({
      treatment: 'GLOBAL_TREATMENT',
      config: '{ global: true }',
      label: 'fallback - label by global',
    });
  });

  test('returns control fallback if flag and global are missing', () => {
    const config: FallbackTreatmentConfiguration = {
      byFlag: {},
    };
    const calculator = new FallbackTreatmentsCalculator(config);
    const result = calculator.resolve('missingFlag', 'label by noFallback');

    expect(result).toEqual({
      treatment: CONTROL,
      config: null,
      label: 'label by noFallback',
    });
  });
});
