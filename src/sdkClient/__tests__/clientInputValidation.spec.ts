// Test target
import { clientInputValidationDecorator } from '../clientInputValidation';

// Mocks
import { DebugLogger } from '../../logger/browser/DebugLogger';

const settings: any = {
  log: DebugLogger(),
  sync: { __splitFiltersValidation: { groupedFilters: { bySet: [] } } }
};

const client: any = {};

const readinessManager: any = {
  isReady: () => true,
  isDestroyed: () => false
};

describe('clientInputValidationDecorator', () => {
  const clientWithValidation = clientInputValidationDecorator(settings, client, readinessManager);
  const logSpy = jest.spyOn(console, 'log');

  beforeEach(() => {
    logSpy.mockClear();
  });

  test('should return control and log an error if the passed 2nd argument (feature flag(s) or flag set(s)) is invalid', () => {
    expect(clientWithValidation.getTreatment('key')).toEqual('control');
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatment: you passed a null or undefined feature flag name. It must be a non-empty string.');

    expect(clientWithValidation.getTreatmentWithConfig('key', [])).toEqual({ treatment: 'control', config: null });
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentWithConfig: you passed an invalid feature flag name. It must be a non-empty string.');

    expect(clientWithValidation.getTreatments('key')).toEqual({});
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatments: feature flag names must be a non-empty array.');

    expect(clientWithValidation.getTreatmentsWithConfig('key', [])).toEqual({});
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsWithConfig: feature flag names must be a non-empty array.');

    expect(clientWithValidation.getTreatmentsByFlagSet('key')).toEqual({});
    expect(logSpy).toBeCalledWith('[ERROR] splitio => getTreatmentsByFlagSet: you passed a null or undefined flag set. It must be a non-empty string.');

    expect(clientWithValidation.getTreatmentsWithConfigByFlagSet('key', [])).toEqual({});
    expect(logSpy).toBeCalledWith('[ERROR] splitio => getTreatmentsWithConfigByFlagSet: you passed an invalid flag set. It must be a non-empty string.');

    expect(clientWithValidation.getTreatmentsByFlagSets('key')).toEqual({});
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsByFlagSets: flag sets must be a non-empty array.');

    expect(clientWithValidation.getTreatmentsWithConfigByFlagSets('key', [])).toEqual({});
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsWithConfigByFlagSets: flag sets must be a non-empty array.');

    // @TODO should be 8, but there is an additional log from `getTreatmentsByFlagSet` and `getTreatmentsWithConfigByFlagSet` that should be removed
    expect(logSpy).toBeCalledTimes(10);
  });
});
