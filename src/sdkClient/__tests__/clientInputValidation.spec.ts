// Test target
import { clientInputValidationDecorator } from '../clientInputValidation';

// Mocks
import { DebugLogger } from '../../logger/browser/DebugLogger';
import { createClientMock } from './testUtils';

const settings: any = {
  log: DebugLogger(),
  sync: { __splitFiltersValidation: { groupedFilters: { bySet: [] } } }
};

const EVALUATION_RESULT = 'on';
const client: any = createClientMock(EVALUATION_RESULT);

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

  test('should evaluate but log an error if the passed 4th argument (evaluation options) is invalid', () => {
    expect(clientWithValidation.getTreatment('key', 'ff', undefined, 'invalid')).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatment: evaluation options must be a plain object.');
    expect(client.getTreatment).toBeCalledWith('key', 'ff', undefined, undefined);

    expect(clientWithValidation.getTreatmentWithConfig('key', 'ff', undefined, { properties: 'invalid' })).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentWithConfig: properties must be a plain object.');
    expect(client.getTreatmentWithConfig).toBeCalledWith('key', 'ff', undefined, undefined);

    expect(clientWithValidation.getTreatments('key', ['ff'], undefined, { properties: 'invalid' })).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatments: properties must be a plain object.');
    expect(client.getTreatments).toBeCalledWith('key', ['ff'], undefined, undefined);

    expect(clientWithValidation.getTreatmentsWithConfig('key', ['ff'], {}, { properties: true })).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsWithConfig: properties must be a plain object.');
    expect(client.getTreatmentsWithConfig).toBeCalledWith('key', ['ff'], {}, undefined);

    expect(clientWithValidation.getTreatmentsByFlagSet('key', 'flagSet', undefined, { properties: 'invalid' })).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsByFlagSet: properties must be a plain object.');
    expect(client.getTreatmentsByFlagSet).toBeCalledWith('key', 'flagset', undefined, undefined);

    expect(clientWithValidation.getTreatmentsWithConfigByFlagSet('key', 'flagSet', {}, { properties: 'invalid' })).toBe(EVALUATION_RESULT);
    expect(logSpy).toBeCalledWith('[ERROR] splitio => getTreatmentsWithConfigByFlagSet: properties must be a plain object.');
    expect(client.getTreatmentsWithConfigByFlagSet).toBeCalledWith('key', 'flagset', {}, undefined);

    expect(clientWithValidation.getTreatmentsByFlagSets('key', ['flagSet'], undefined, { properties: 'invalid' })).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsByFlagSets: properties must be a plain object.');
    expect(client.getTreatmentsByFlagSets).toBeCalledWith('key', ['flagset'], undefined, undefined);

    expect(clientWithValidation.getTreatmentsWithConfigByFlagSets('key', ['flagSet'], {}, { properties: 'invalid' })).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[ERROR] splitio => getTreatmentsWithConfigByFlagSets: properties must be a plain object.');
    expect(client.getTreatmentsWithConfigByFlagSets).toBeCalledWith('key', ['flagset'], {}, undefined);
  });

  test('should sanitize the properties in the 4th argument', () => {
    expect(clientWithValidation.getTreatment('key', 'ff', undefined, { properties: { toSanitize: /asd/, correct: 100 }})).toBe(EVALUATION_RESULT);
    expect(logSpy).toHaveBeenLastCalledWith('[WARN]  splitio => getTreatment: Property "toSanitize" is of invalid type. Setting value to null.');
    expect(client.getTreatment).toBeCalledWith('key', 'ff', undefined, { properties: { toSanitize: null, correct: 100 }});
  });
});
