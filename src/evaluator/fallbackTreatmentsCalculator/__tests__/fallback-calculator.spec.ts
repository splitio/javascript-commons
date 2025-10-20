import { FallbackTreatmentsCalculator } from '../';
import type { FallbackTreatmentConfiguration } from '../../../../types/splitio';
import { CONTROL } from '../../../utils/constants';

describe('FallbackTreatmentsCalculator', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const longName = 'a'.repeat(101);

  test('logs an error if flag name is invalid - by Flag', () => {
    let config: FallbackTreatmentConfiguration = {
      byFlag: {
        'feature A': { treatment: 'TREATMENT_A', config: '{ value: 1 }' },
      },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[0][0]).toBe(
      'Fallback treatments - Discarded flag \'feature A\': Invalid flag name (max 100 chars, no spaces)'
    );
    config = {
      byFlag: {
        [longName]: { treatment: 'TREATMENT_A', config: '{ value: 1 }' },
      },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[1][0]).toBe(
      `Fallback treatments - Discarded flag '${longName}': Invalid flag name (max 100 chars, no spaces)`
    );

    config = {
      byFlag: {
        'featureB': { treatment: longName, config: '{ value: 1 }' },
      },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[2][0]).toBe(
      'Fallback treatments - Discarded treatment for flag \'featureB\': Invalid treatment (max 100 chars and must match pattern)'
    );

    config = {
      byFlag: {
        // @ts-ignore
        'featureC': { config: '{ global: true }' },
      },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[3][0]).toBe(
      'Fallback treatments - Discarded treatment for flag \'featureC\': Invalid treatment (max 100 chars and must match pattern)'
    );

    config = {
      byFlag: {
        // @ts-ignore
        'featureC': { treatment: 'invalid treatment!', config: '{ global: true }' },
      },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[4][0]).toBe(
      'Fallback treatments - Discarded treatment for flag \'featureC\': Invalid treatment (max 100 chars and must match pattern)'
    );
  });

  test('logs an error if flag name is invalid - global', () => {
    let config: FallbackTreatmentConfiguration = {
      global: { treatment: longName, config: '{ value: 1 }' },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[2][0]).toBe(
      'Fallback treatments - Discarded treatment for flag \'featureB\': Invalid treatment (max 100 chars and must match pattern)'
    );

    config = {
      // @ts-ignore
      global: { config: '{ global: true }' },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[3][0]).toBe(
      'Fallback treatments - Discarded treatment for flag \'featureC\': Invalid treatment (max 100 chars and must match pattern)'
    );

    config = {
      // @ts-ignore
      global: { treatment: 'invalid treatment!', config: '{ global: true }' },
    };
    new FallbackTreatmentsCalculator(config);
    expect(spy.mock.calls[4][0]).toBe(
      'Fallback treatments - Discarded treatment for flag \'featureC\': Invalid treatment (max 100 chars and must match pattern)'
    );
  });

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

  test('returns undefined label if no label provided', () => {
    const config: FallbackTreatmentConfiguration = {
      byFlag: {
        'featureB': { treatment: 'TREATMENT_B' },
      },
    };
    const calculator = new FallbackTreatmentsCalculator(config);
    const result = calculator.resolve('featureB');

    expect(result).toEqual({
      treatment: 'TREATMENT_B',
      config: undefined,
      label: '',
    });
  });
});
