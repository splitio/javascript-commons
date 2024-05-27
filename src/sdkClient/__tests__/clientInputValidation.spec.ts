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

    expect(clientWithValidation.getTreatmentsWithConfig('key')).toEqual({});
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsWithConfig: feature flag names must be a non-empty array.');

    // @TODO fix log error message for getTreatmentsByFlagSet
    // expect(clientWithValidation.getTreatmentsByFlagSet('key')).toEqual({});
    // expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsByFlagSet: you passed a null or undefined flag set name. It must be a non-empty string.');

    expect(clientWithValidation.getTreatmentsWithConfigByFlagSets('key')).toEqual({});
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsWithConfigByFlagSets: flag sets must be a non-empty array.');
  });
});
